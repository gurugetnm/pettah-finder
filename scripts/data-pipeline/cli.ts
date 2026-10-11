import "dotenv/config";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { categories as seedCategories } from "../../prisma/seed-data";
import { readRows, rowsToRecords } from "./file-import";
import {
  categoryMapSchema,
  loadBoundary,
  loadDecisions,
  loadSources,
  paths,
  readJson,
  ROOT,
  safeInputPath,
  sanitizeFileName,
  streetAliasSchema,
  WORK_DIR,
  writeJson,
} from "./files";
import { streetMatcher } from "./normalize";
import {
  fetchOverpass,
  OSM_LICENSE,
  overpassQuery,
  parseOverpass,
} from "./osm";
import { collectionBlocker, publicationBlocker } from "./permissions";
import { processBatches, type Batch, type ProcessResult } from "./process";
import {
  applyPlan,
  backupFor,
  planPublication,
  publishBlocker,
  rollback,
  summarize,
  type Backup,
} from "./publish";
import {
  filterCandidates,
  FILTERS,
  recordDecision,
  writeReports,
  type Filter,
} from "./review";
import type { Candidate } from "./schema";

const log = (message: string) =>
  console.log(`[data ${new Date().toISOString()}] ${message}`);
const rel = (p: string) => relative(ROOT, p);
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type RawFile = {
  meta: {
    source: string;
    collectedAt: string;
    origin: string;
    datasetVersion?: string;
  };
  payload: unknown;
};
type CandidatesFile = ProcessResult & {
  generatedAt: string;
  inputs: unknown[];
};

function sourceById(id: string) {
  const { valid } = loadSources();
  const source = valid.find((s) => s.id === id);
  if (!source)
    throw new Error(
      `Source ${id} is missing or its manifest entry is invalid (run data:check-sources)`,
    );
  return source;
}

function saveRaw(raw: RawFile) {
  const file = resolve(
    paths.raw,
    raw.meta.source,
    `${raw.meta.collectedAt.replace(/[:.]/g, "-")}.json`,
  );
  writeJson(file, raw);
  return file;
}

async function checkSources() {
  let failed = false;
  const boundary = loadBoundary();
  log(
    `Boundary: ${boundary.name} (authoritative: ${boundary.authoritative}, validated ${boundary.validatedAt})`,
  );
  const { valid, errors } = loadSources();
  for (const s of valid)
    log(
      `${s.id.padEnd(14)} ${s.permissionStatus.padEnd(20)} collect: ${collectionBlocker(s) ?? "allowed"} | publish: ${publicationBlocker(s) ?? "allowed"}`,
    );
  for (const e of errors) {
    failed = true;
    log(`INVALID source ${e.id}: ${e.issues.join("; ")}`);
  }
  const known = new Set<string>(seedCategories.map(([slug]) => slug));
  const map = categoryMapSchema.parse(readJson(paths.categoryMap)).shop;
  for (const [tag, slugs] of Object.entries(map))
    for (const slug of slugs)
      if (!known.has(slug)) {
        failed = true;
        log(`INVALID mapping shop=${tag} -> ${slug}`);
      }
  streetAliasSchema.parse(readJson(paths.streetAliases));
  log(`${Object.keys(loadDecisions()).length} review decision(s) valid`);
  if (failed) process.exitCode = 1;
}

async function fetchOsm(args: {
  file?: string;
  endpoint?: string;
  refresh?: boolean;
}) {
  const source = sourceById("osm");
  const collectedAt = new Date().toISOString();
  let payload: unknown;
  let origin: string;
  if (args.file) {
    // Local Overpass-JSON extract or fixture: preferred for larger/recurring imports.
    const file = safeInputPath(args.file, [".json"]);
    payload = readJson(file);
    origin = `file:${rel(file)}`;
  } else {
    const blocked = collectionBlocker(source);
    if (blocked) throw new Error(`OSM collection blocked: ${blocked}`);
    const contact = process.env.DATA_PIPELINE_CONTACT ?? "";
    if (!contact.trim())
      throw new Error(
        "Set DATA_PIPELINE_CONTACT (project URL or email) to identify Overpass requests",
      );
    const endpoint = args.endpoint ?? source.allowedEndpoints?.[0] ?? "";
    const query = overpassQuery(loadBoundary());
    const cacheFile = resolve(
      paths.cache,
      `${createHash("sha256")
        .update(endpoint + query)
        .digest("hex")
        .slice(0, 16)}.json`,
    );
    if (
      !args.refresh &&
      existsSync(cacheFile) &&
      Date.now() - statSync(cacheFile).mtimeMs < CACHE_TTL_MS
    ) {
      log(
        `Using cached Overpass response ${rel(cacheFile)} (pass --refresh to re-query)`,
      );
      payload = readJson(cacheFile);
    } else {
      log(`Querying ${endpoint} for the Pettah study area`);
      payload = await fetchOverpass(
        { source, endpoint, query, contact },
        { log },
      );
      writeJson(cacheFile, payload);
    }
    origin = endpoint;
  }
  const parsed = parseOverpass(payload); // fail now on malformed data rather than storing it
  const file = saveRaw({
    meta: {
      source: "osm",
      collectedAt,
      origin,
      datasetVersion: parsed.datasetVersion,
    },
    payload,
  });
  log(
    `Stored ${parsed.records.length} OSM element(s) (${parsed.errors.length} malformed) at ${rel(file)}; dataset ${parsed.datasetVersion ?? "unknown"}`,
  );
}

async function importFile(args: { source?: string; file?: string }) {
  if (!args.source || !args.file)
    throw new Error(
      "Usage: data:import:file --source <id> --file <path.csv|path.json>",
    );
  const source = sourceById(args.source);
  if (source.type !== "file")
    throw new Error(
      `Source ${source.id} is type ${source.type}, not a licensed file source`,
    );
  const blocked = publicationBlocker(source);
  if (blocked)
    log(
      `WARNING: ${source.id} cannot be published (${blocked}); records will be reviewable only`,
    );
  const file = safeInputPath(args.file, [".csv", ".json"]);
  const rows = readRows(file);
  rowsToRecords(rows, source); // validate shape now
  const out = saveRaw({
    meta: {
      source: source.id,
      collectedAt: new Date().toISOString(),
      origin: `file:${rel(file)}`,
    },
    payload: rows,
  });
  log(`Stored ${rows.length} row(s) from ${rel(file)} at ${rel(out)}`);
}

function latestRaw(): string[] {
  if (!existsSync(paths.raw)) return [];
  return readdirSync(paths.raw).flatMap((dir) => {
    const files = readdirSync(resolve(paths.raw, dir))
      .filter((f) => f.endsWith(".json"))
      .sort();
    return files.length ? [resolve(paths.raw, dir, files.at(-1)!)] : [];
  });
}

async function processRaw() {
  const { valid: sources } = loadSources();
  const files = latestRaw();
  if (!files.length)
    throw new Error(
      "No raw data. Run data:fetch:osm or data:import:file first.",
    );
  const batches: Batch[] = [];
  const inputs = [];
  const quarantineExtra: { id: string; reasons: string[] }[] = [];
  for (const file of files) {
    const raw = readJson(file) as RawFile;
    const source = sources.find((s) => s.id === raw.meta.source);
    if (!source)
      throw new Error(
        `Raw file ${rel(file)} references unknown source ${raw.meta.source}`,
      );
    const { records, errors, datasetVersion } =
      source.type === "osm"
        ? parseOverpass(raw.payload)
        : {
            ...rowsToRecords(raw.payload as unknown[], source),
            datasetVersion: raw.meta.datasetVersion,
          };
    if (source.type === "osm" && source.license !== OSM_LICENSE)
      throw new Error("OSM manifest license must be ODbL-1.0");
    quarantineExtra.push(
      ...errors.map((e) => ({
        id: `${source.id}:${e.ref}`,
        reasons: [e.reason],
      })),
    );
    batches.push({
      source,
      records,
      collectedAt: raw.meta.collectedAt,
      datasetVersion,
    });
    inputs.push({
      source: source.id,
      rawFile: rel(file),
      origin: raw.meta.origin,
      datasetVersion,
      received: records.length + errors.length,
    });
  }
  const result = processBatches(batches, {
    boundary: loadBoundary(),
    categoryMap: categoryMapSchema.parse(readJson(paths.categoryMap)).shop,
    matchStreet: streetMatcher(
      streetAliasSchema.parse(readJson(paths.streetAliases)).streets,
    ),
  });
  result.quarantine.unshift(...quarantineExtra);
  result.summary.received += quarantineExtra.length;
  result.summary.quarantined += quarantineExtra.length;
  const out: CandidatesFile = {
    generatedAt: new Date().toISOString(),
    inputs,
    ...result,
  };
  writeJson(paths.candidates, out);
  writeReports(WORK_DIR, out, loadDecisions());
  for (const [k, v] of Object.entries(result.summary)) log(`${k}: ${v}`);
  log(
    `Wrote ${rel(paths.candidates)}, ${rel(WORK_DIR)}/report.md and review-export.csv`,
  );
}

function loadCandidates(): CandidatesFile {
  if (!existsSync(paths.candidates))
    throw new Error("No candidates. Run data:process first.");
  return readJson(paths.candidates) as CandidatesFile;
}

function describe(c: Candidate, decision: unknown) {
  return JSON.stringify({ ...c, decision: decision ?? "pending" }, null, 2);
}

async function review(
  positionals: string[],
  args: Record<string, string | boolean | undefined>,
) {
  const [command = "list", id] = positionals;
  const data = loadCandidates();
  const decisions = loadDecisions();
  if (command === "list") {
    const filter = (args.filter ?? "pending") as Filter;
    if (!FILTERS.includes(filter))
      throw new Error(`--filter must be one of ${FILTERS.join(", ")}`);
    const rows = filterCandidates(data.candidates, decisions, filter);
    for (const c of rows)
      console.log(
        `${c.id.padEnd(22)} ${c.name.slice(0, 36).padEnd(36)} ${(decisions[c.id]?.streetSlug ?? c.streetSlug ?? "-").padEnd(18)} ${c.flags.join(",")}`,
      );
    log(`${rows.length} candidate(s) match "${filter}"`);
    return;
  }
  if (command === "invalid") {
    for (const q of data.quarantine)
      console.log(`${q.id}: ${q.reasons.join("; ")}`);
    return;
  }
  if (command === "duplicates") {
    for (const d of data.duplicates)
      console.log(
        `${d.outcome} ${d.score} ${d.a} <-> ${d.b}: ${d.reasons.join(", ")}`,
      );
    return;
  }
  const candidate = data.candidates.find((c) => c.id === id);
  if (!candidate)
    throw new Error(
      `Usage: data:review ${command} <candidate-id>; id not found`,
    );
  if (command === "show")
    return console.log(describe(candidate, decisions[candidate.id]));
  if (command !== "approve" && command !== "reject")
    throw new Error(`Unknown review command ${command}`);
  const reviewer = String(args.reviewer ?? process.env.DATA_REVIEWER ?? "");
  if (!reviewer) throw new Error("Pass --reviewer <name> or set DATA_REVIEWER");
  recordDecision(decisions, candidate.id, {
    decision: command === "approve" ? "approved" : "rejected",
    independentlyVerified: command === "approve" && args.verified === true,
    evidence: args.evidence as string | undefined,
    streetSlug: args.street as string | undefined,
    categories:
      typeof args.categories === "string"
        ? args.categories
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
    duplicateResolution: args.distinct ? "distinct" : undefined,
    notes: args.notes as string | undefined,
    reviewer,
    reviewedAt: new Date().toISOString(),
  });
  log(`Recorded ${command} for ${candidate.id} in ${rel(paths.decisions)}`);
}

async function report() {
  const data = loadCandidates();
  writeReports(WORK_DIR, data, loadDecisions());
  for (const [k, v] of Object.entries(data.summary)) log(`${k}: ${v}`);
  log(`Wrote ${rel(WORK_DIR)}/report.md and review-export.csv`);
}

function database() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 2,
    }),
  });
}

async function publish(args: {
  apply?: boolean;
  "confirm-host"?: string;
  rollback?: string;
}) {
  const blocked = publishBlocker(process.env, {
    apply: !!args.apply || !!args.rollback,
    confirmHost: args["confirm-host"],
  });
  if (blocked) throw new Error(blocked);
  const db = database();
  try {
    if (args.rollback) {
      const file = safeInputPath(
        resolve(paths.backups, sanitizeFileName(args.rollback)),
        [".json"],
      );
      const backup = readJson(file) as Backup;
      if (backup.status !== "applied")
        log(
          "WARNING: backup was never marked applied; restoring anyway is safe (idempotent)",
        );
      await rollback(db, backup);
      log(
        `Rolled back ${rel(file)}: restored ${backup.updated.length} shop(s), withdrew ${backup.inserted.length} inserted shop(s) to DRAFT`,
      );
      return;
    }
    const { candidates } = loadCandidates();
    const plan = await planPublication(db, {
      candidates,
      decisions: loadDecisions(),
      sources: loadSources().valid,
    });
    for (const item of plan) {
      if (item.action === "insert")
        log(
          `INSERT ${item.candidate.id} -> /shops/${item.slug} (${item.fields.publicationStatus}/${item.fields.verificationStatus})`,
        );
      else if (item.action === "update")
        log(`UPDATE ${item.candidate.id}: ${item.changes.join(", ")}`);
      else if (item.action === "conflict" || item.action === "refused")
        log(`${item.action.toUpperCase()} ${item.id}: ${item.reason}`);
    }
    log(`Plan: ${JSON.stringify(summarize(plan))}`);
    if (!args.apply)
      return log(
        "Dry run: no database changes made. Run pnpm data:publish to write.",
      );
    const now = new Date();
    const backup = await backupFor(db, plan, now);
    const backupFile = resolve(
      paths.backups,
      `${now.toISOString().replace(/[:.]/g, "-")}.json`,
    );
    writeJson(backupFile, backup);
    await applyPlan(db, plan, now);
    writeJson(backupFile, { ...backup, status: "applied" });
    log(
      `Applied. Backup for rollback: ${rel(backupFile)} (pnpm data:publish --rollback ${backupFile.split("/").pop()})`,
    );
  } finally {
    await db.$disconnect();
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      file: { type: "string" },
      endpoint: { type: "string" },
      refresh: { type: "boolean" },
      source: { type: "string" },
      filter: { type: "string" },
      reviewer: { type: "string" },
      street: { type: "string" },
      categories: { type: "string" },
      notes: { type: "string" },
      evidence: { type: "string" },
      verified: { type: "boolean" },
      distinct: { type: "boolean" },
      apply: { type: "boolean" },
      "confirm-host": { type: "string" },
      rollback: { type: "string" },
    },
  });
  const commands: Record<string, () => Promise<unknown>> = {
    "check-sources": checkSources,
    "fetch-osm": () => fetchOsm(values),
    "import-file": () => importFile(values),
    process: processRaw,
    review: () => review(positionals, values),
    report,
    publish: () => publish(values),
  };
  const run = command && commands[command];
  if (!run)
    throw new Error(`Usage: cli.ts <${Object.keys(commands).join("|")}>`);
  log(`start ${command}`);
  await run();
  log(`done ${command}`);
}

main().catch((error: Error) => {
  console.error(`[data] FAILED: ${error.message}`);
  process.exitCode = 1;
});
