import { paths, writeJson, writeText } from "./files";
import type { ProcessResult } from "./process";
import { decisionSchema, type Candidate, type Decision } from "./schema";

export const FILTERS = [
  "pending",
  "approved",
  "rejected",
  "duplicates",
  "unknown-category",
  "out-of-area",
  "unassigned",
  "all",
] as const;
export type Filter = (typeof FILTERS)[number];

export function filterCandidates(
  candidates: Candidate[],
  decisions: Record<string, Decision>,
  filter: Filter,
) {
  return candidates.filter((c) => {
    const d = decisions[c.id];
    switch (filter) {
      case "pending":
        return !d;
      case "approved":
        return d?.decision === "approved";
      case "rejected":
        return d?.decision === "rejected";
      case "duplicates":
        return c.flags.includes("possible_duplicate");
      case "unknown-category":
        return c.flags.includes("category_unknown");
      case "out-of-area":
        return c.flags.includes("out_of_area");
      case "unassigned":
        return !(d?.streetSlug ?? c.streetSlug);
      case "all":
        return true;
    }
  });
}

/** Persist a decision. File is version-controlled, sorted, and validated so reruns are reproducible. */
export function recordDecision(
  decisions: Record<string, Decision>,
  id: string,
  decision: Decision,
  file = paths.decisions,
) {
  const parsed = decisionSchema.parse(decision);
  const next = { ...decisions, [id]: parsed };
  const sorted = Object.fromEntries(
    Object.entries(next).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeJson(file, { decisions: sorted });
  return sorted;
}

/** Neutralize spreadsheet formulas (=, +, -, @, tab, CR) and quote every cell. */
export function csvCell(value: unknown) {
  let s =
    value === undefined || value === null
      ? ""
      : Array.isArray(value)
        ? value.join("; ")
        : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function reviewCsv(
  candidates: Candidate[],
  decisions: Record<string, Decision>,
) {
  const header = [
    "id",
    "name",
    "street",
    "street_slug",
    "categories",
    "phone",
    "website",
    "latitude",
    "longitude",
    "location_precision",
    "flags",
    "decision",
    "verified",
    "notes",
    "source_url",
  ];
  const rows = candidates.map((c) => {
    const d = decisions[c.id];
    return [
      c.id,
      c.name,
      c.streetName,
      d?.streetSlug ?? c.streetSlug,
      d?.categories ?? c.categories,
      c.contactPhone ?? c.contactPhoneRaw,
      c.website,
      c.latitude,
      c.longitude,
      c.locationPrecision,
      c.flags,
      d?.decision ?? "pending",
      d?.independentlyVerified,
      d?.notes,
      c.sourceUrl,
    ];
  });
  return (
    [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}

export function markdownReport(
  result: ProcessResult & { generatedAt: string },
  decisions: Record<string, Decision>,
) {
  const name = new Map(result.candidates.map((c) => [c.id, c.name]));
  const reviewed = result.candidates.filter((c) => decisions[c.id]);
  const lines = [
    `# Data pipeline report`,
    ``,
    `Generated ${result.generatedAt}. Candidates are unverified source data until reviewed with evidence.`,
    ``,
    `| Metric | Count |`,
    `| --- | --- |`,
    ...Object.entries(result.summary).map(([k, v]) => `| ${k} | ${v} |`),
    `| reviewed | ${reviewed.length} |`,
    `| approved | ${reviewed.filter((c) => decisions[c.id].decision === "approved").length} |`,
    `| independently verified | ${reviewed.filter((c) => decisions[c.id].independentlyVerified).length} |`,
    ``,
    `## Duplicate suggestions`,
    ``,
    ...(result.duplicates.length
      ? result.duplicates.map(
          (d) =>
            `- **${d.outcome}** (${d.score}): ${name.get(d.a)} \`${d.a}\` ↔ ${name.get(d.b)} \`${d.b}\` — ${d.reasons.join(", ")}`,
        )
      : ["None."]),
    ``,
    `## Quarantined records`,
    ``,
    ...(result.quarantine.length
      ? result.quarantine.map((q) => `- \`${q.id}\`: ${q.reasons.join("; ")}`)
      : ["None."]),
    ``,
    `## Flags`,
    ``,
    ...result.candidates
      .filter((c) => c.flags.length)
      .map((c) => `- \`${c.id}\` ${c.name}: ${c.flags.join(", ")}`),
    ``,
  ];
  return lines.join("\n");
}

export function writeReports(
  dir: string,
  result: ProcessResult & { generatedAt: string },
  decisions: Record<string, Decision>,
) {
  writeText(`${dir}/report.md`, markdownReport(result, decisions));
  writeText(
    `${dir}/review-export.csv`,
    reviewCsv(result.candidates, decisions),
  );
}
