import { categories as seedCategories } from "../../prisma/seed-data";
import { findDuplicates } from "./dedupe";
import {
  cleanName,
  comparisonKey,
  inBoundary,
  mapCategories,
  normalizePhone,
  normalizeWebsite,
  validCoordinate,
} from "./normalize";
import {
  candidateSchema,
  type Boundary,
  type Candidate,
  type Source,
} from "./schema";

/** Source-neutral record produced by an adapter before normalization. Missing stays missing. */
export type RawRecord = {
  sourceRecordId: string;
  sourceUrl?: string;
  name?: string;
  street?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  locationPrecision: Candidate["locationPrecision"];
  phone?: string;
  website?: string;
  openingHours?: string;
  shopTag?: string;
  categories?: string[];
  rawTags?: Record<string, string>;
};

export type Batch = {
  source: Source;
  records: RawRecord[];
  collectedAt: string;
  datasetVersion?: string;
};
export type Context = {
  boundary: Boundary;
  categoryMap: Record<string, string[]>;
  matchStreet: (name: string | undefined) => string | undefined;
};
export type Quarantined = { id: string; reasons: string[] };

const KNOWN_CATEGORIES = new Set<string>(seedCategories.map(([slug]) => slug));

export function toCandidate(
  record: RawRecord,
  batch: Batch,
  ctx: Context,
): Candidate | Quarantined | { unnamed: string } {
  const id = `${batch.source.id}:${record.sourceRecordId}`;
  const name = cleanName(record.name);
  // Unnamed features are kept for geographic analysis only; a name is never invented.
  if (!name) return { unnamed: id };
  const flags: string[] = [];
  const reasons: string[] = [];

  const streetName = cleanName(record.street);
  const streetSlug = ctx.matchStreet(streetName);
  if (!streetName) flags.push("street_missing");
  else if (!streetSlug) flags.push("street_unmatched");

  const phone = normalizePhone(record.phone);
  if (phone.issue) flags.push(phone.issue);
  const site = normalizeWebsite(record.website);
  if (site.issue) flags.push(site.issue);

  let { latitude, longitude } = record;
  if (latitude === undefined && longitude === undefined)
    flags.push("location_missing");
  else if (!validCoordinate(latitude, longitude))
    reasons.push("invalid coordinates");
  else if (!inBoundary(latitude, longitude!, ctx.boundary))
    flags.push("out_of_area");
  if (reasons.length) latitude = longitude = undefined;

  const mapped = record.categories
    ? {
        categories: record.categories
          .filter((c) => KNOWN_CATEGORIES.has(c))
          .sort(),
        issue:
          record.categories.some((c) => !KNOWN_CATEGORIES.has(c)) ||
          !record.categories.length
            ? "category_unknown"
            : undefined,
      }
    : mapCategories(record.shopTag, ctx.categoryMap);
  if (mapped.issue) flags.push(mapped.issue);

  const candidate = {
    id,
    source: batch.source.id,
    sourceRecordId: record.sourceRecordId,
    sourceUrl: record.sourceUrl,
    name,
    normalizedName: comparisonKey(name),
    streetName,
    normalizedStreetName: streetName && comparisonKey(streetName),
    streetSlug,
    address: cleanName(record.address),
    latitude,
    longitude,
    categories: mapped.categories,
    products: [],
    contactPhone: phone.phone,
    contactPhoneRaw: record.phone?.trim() || undefined,
    website: site.website,
    openingHours: cleanName(record.openingHours),
    locationPrecision:
      latitude === undefined ? "unknown" : record.locationPrecision,
    collectedAt: batch.collectedAt,
    flags: flags.sort(),
    rawTags: record.rawTags,
    provenance: {
      sourceLicense: batch.source.license || "UNKNOWN",
      attribution: batch.source.attribution || undefined,
      originalRecordReference: record.sourceUrl ?? id,
      sourceDatasetVersion: batch.datasetVersion,
    },
  };
  const parsed = candidateSchema.safeParse(candidate);
  if (!parsed.success)
    reasons.push(
      ...parsed.error.issues.map(
        (i) => `${i.path.join(".") || "record"}: ${i.message}`,
      ),
    );
  return reasons.length ? { id, reasons } : parsed.data!;
}

/** Normalize, validate, check geography and detect duplicates. One bad record never fails the batch. */
export function processBatches(batches: Batch[], ctx: Context) {
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  const quarantine: Quarantined[] = [];
  const unnamed: string[] = [];
  let exactDuplicates = 0;
  let received = 0;
  for (const batch of batches)
    for (const record of batch.records) {
      received++;
      const result = toCandidate(record, batch, ctx);
      if ("unnamed" in result) unnamed.push(result.unnamed);
      else if ("reasons" in result) quarantine.push(result);
      else if (seen.has(result.id))
        exactDuplicates++; // same source identity: idempotent
      else {
        seen.add(result.id);
        candidates.push(result);
      }
    }
  const duplicates = findDuplicates(candidates);
  const involved = new Set(duplicates.flatMap((d) => [d.a, d.b]));
  for (const c of candidates)
    if (involved.has(c.id)) c.flags = [...c.flags, "possible_duplicate"].sort();
  candidates.sort((a, b) => a.id.localeCompare(b.id));
  return {
    candidates,
    quarantine,
    unnamed: unnamed.sort(),
    duplicates,
    summary: {
      received,
      valid: candidates.length,
      quarantined: quarantine.length,
      unnamed: unnamed.length,
      exactDuplicates,
      duplicateSuggestions: duplicates.length,
      outOfArea: candidates.filter((c) => c.flags.includes("out_of_area"))
        .length,
      unknownCategory: candidates.filter((c) =>
        c.flags.includes("category_unknown"),
      ).length,
      streetUnassigned: candidates.filter((c) => !c.streetSlug).length,
    },
  };
}
export type ProcessResult = ReturnType<typeof processBatches>;
