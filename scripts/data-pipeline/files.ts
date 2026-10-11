import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, relative, resolve } from "node:path";
import { z } from "zod";
import {
  boundarySchema,
  decisionsFileSchema,
  sourceSchema,
  sourcesFileSchema,
  type Source,
} from "./schema";

export const ROOT = process.cwd();
// Raw downloads, candidates and backups may hold contact details: kept under the git-ignored .local/.
export const WORK_DIR = resolve(ROOT, ".local/data-pipeline");
export const paths = {
  boundary: resolve(ROOT, "data/manifests/boundary.json"),
  sources: resolve(ROOT, "data/manifests/sources.json"),
  categoryMap: resolve(ROOT, "data/mappings/categories.json"),
  streetAliases: resolve(ROOT, "data/mappings/street-aliases.json"),
  decisions: resolve(ROOT, "data/review/decisions.json"),
  raw: resolve(WORK_DIR, "raw"),
  cache: resolve(WORK_DIR, "cache"),
  candidates: resolve(WORK_DIR, "candidates.json"),
  backups: resolve(WORK_DIR, "publish-backups"),
};

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export function readJson(path: string, maxBytes = 50 * 1024 * 1024): unknown {
  if (statSync(path).size > maxBytes)
    throw new Error(`${relative(ROOT, path)} exceeds size limit`);
  return JSON.parse(readFileSync(path, "utf8"));
}

// Write to a temp file then rename, so a crash never leaves a half-written file.
export function writeJson(path: string, value: unknown) {
  writeText(path, `${JSON.stringify(value, null, 2)}\n`);
}
export function writeText(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, value, { mode: 0o600 });
  renameSync(tmp, path);
}

/** Resolve a user-supplied input path, refusing anything outside the repository or with an unexpected extension. */
export function safeInputPath(
  input: string,
  extensions: string[],
  root = ROOT,
) {
  const full = realpathSync(resolve(root, input));
  const rel = relative(realpathSync(root), full);
  if (rel.startsWith("..") || resolve(rel) === rel)
    throw new Error("Input file must be inside the repository");
  if (!extensions.includes(extname(full).toLowerCase()))
    throw new Error(`Input file must be one of: ${extensions.join(", ")}`);
  if (statSync(full).size > MAX_INPUT_BYTES)
    throw new Error("Input file exceeds 5 MB limit");
  return full;
}

export function sanitizeFileName(name: string) {
  const base = name.split(/[\\/]/).pop() ?? "";
  const clean = base
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 80);
  if (!clean) throw new Error("Invalid file name");
  return clean;
}

export const loadBoundary = () =>
  boundarySchema.parse(readJson(paths.boundary));

export function loadSources(path = paths.sources) {
  const valid: Source[] = [];
  const errors: { id: string; issues: string[] }[] = [];
  for (const raw of sourcesFileSchema.parse(readJson(path)).sources) {
    const parsed = sourceSchema.safeParse(raw);
    if (parsed.success) valid.push(parsed.data);
    else
      errors.push({
        id: String((raw as { id?: unknown })?.id ?? "?"),
        issues: parsed.error.issues.map(
          (i) => `${i.path.join(".")}: ${i.message}`,
        ),
      });
  }
  return { valid, errors };
}

export function loadDecisions() {
  try {
    return decisionsFileSchema.parse(readJson(paths.decisions)).decisions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

export const categoryMapSchema = z.object({
  shop: z.record(z.string(), z.array(z.string()).min(1)),
});
export const streetAliasSchema = z.object({
  streets: z.record(z.string(), z.array(z.string()).min(1)),
});
