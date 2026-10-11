import { distanceMetres } from "./normalize";
import type { Candidate } from "./schema";

export type MatchOutcome = "probable_duplicate" | "ambiguous" | "distinct";
export type DuplicateSuggestion = {
  a: string;
  b: string;
  score: number;
  outcome: Exclude<MatchOutcome, "distinct">;
  reasons: string[];
};

const tokens = (s: string) =>
  new Set(s.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
function jaccard(a: string, b: string) {
  const x = tokens(a);
  const y = tokens(b);
  const shared = [...x].filter((t) => y.has(t)).length;
  return shared / (x.size + y.size - shared || 1);
}

/**
 * Transparent additive score. No single signal (name, proximity, phone) can
 * reach the probable threshold alone; distance and differing streets subtract,
 * so same-name branches stay distinct. Nothing here merges records.
 */
export function compare(a: Candidate, b: Candidate) {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`${reason} (${points > 0 ? "+" : ""}${points})`);
  };
  if (a.normalizedName === b.normalizedName) add(0.4, "same normalized name");
  else if (jaccard(a.normalizedName, b.normalizedName) >= 0.6)
    add(0.2, "similar name");
  if (a.contactPhone && b.contactPhone) {
    if (a.contactPhone === b.contactPhone) add(0.3, "same phone");
    else add(-0.1, "different phones");
  }
  if (a.website && b.website && a.website === b.website)
    add(0.2, "same website");
  if (a.latitude !== undefined && b.latitude !== undefined) {
    const d = distanceMetres(
      [a.latitude, a.longitude!],
      [b.latitude, b.longitude!],
    );
    if (d <= 20) add(0.2, `${Math.round(d)} m apart`);
    else if (d <= 60) add(0.1, `${Math.round(d)} m apart`);
    else if (d > 200) add(-0.3, `${Math.round(d)} m apart`);
  }
  if (a.streetSlug && b.streetSlug) {
    if (a.streetSlug === b.streetSlug) add(0.1, "same street");
    else add(-0.2, "different streets");
  }
  score = Math.round(score * 100) / 100;
  const outcome: MatchOutcome =
    score >= 0.7
      ? "probable_duplicate"
      : score >= 0.4
        ? "ambiguous"
        : "distinct";
  return { score, outcome, reasons };
}

// shortcut: O(n²) pairwise; fine for a neighbourhood (<5k records), block by street/grid if that grows.
export function findDuplicates(candidates: Candidate[]): DuplicateSuggestion[] {
  const out: DuplicateSuggestion[] = [];
  for (let i = 0; i < candidates.length; i++)
    for (let j = i + 1; j < candidates.length; j++) {
      const result = compare(candidates[i], candidates[j]);
      if (result.outcome !== "distinct")
        out.push({
          a: candidates[i].id,
          b: candidates[j].id,
          ...result,
          outcome: result.outcome,
        });
    }
  return out.sort((x, y) => y.score - x.score || x.a.localeCompare(y.a));
}
