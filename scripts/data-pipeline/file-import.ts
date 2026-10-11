import { readFileSync } from "node:fs";
import { extname } from "node:path";
import { z } from "zod";
import { LOCATION_PRECISION, type Source } from "./schema";
import type { RawRecord } from "./process";

/** Minimal RFC 4180 parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === "") quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV has an unterminated quoted field");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()));
  if (!header) return [];
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) =>
    Object.fromEntries(keys.map((k, i) => [k, r[i]?.trim() ?? ""])),
  );
}

const optionalText = z.preprocess(
  (v) => (v === "" || v === null ? undefined : v),
  z.string().max(1000).optional(),
);
const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().finite().optional(),
);
const rowSchema = z.object({
  id: z.coerce.string().trim().min(1).max(80),
  name: optionalText,
  street: optionalText,
  address: optionalText,
  latitude: optionalNumber,
  longitude: optionalNumber,
  location_precision: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.enum(LOCATION_PRECISION).optional(),
  ),
  phone: optionalText,
  website: optionalText,
  opening_hours: optionalText,
  categories: optionalText, // Pettah Finder category slugs separated by ";"
  source_url: optionalText,
});

const FIELD_COLUMNS: Record<string, string[]> = {
  name: ["name"],
  street: ["street"],
  address: ["address"],
  latitude: ["latitude", "location_precision"],
  longitude: ["longitude"],
  phone: ["phone"],
  website: ["website"],
  openingHours: ["opening_hours"],
  categories: ["categories"],
};

/** Read rows from a CSV or JSON array file (path already checked by safeInputPath). */
export function readRows(path: string): unknown[] {
  const text = readFileSync(path, "utf8");
  const rows =
    extname(path).toLowerCase() === ".csv" ? parseCsv(text) : JSON.parse(text);
  return z
    .array(z.unknown())
    .max(20000, "File has more than 20000 rows")
    .parse(rows);
}

/** Only columns the manifest allows are kept; disallowed ones are dropped. */
export function rowsToRecords(rows: unknown[], source: Source) {
  if (source.type !== "file")
    throw new Error(`Source ${source.id} is not a file source`);
  const allowed = new Set(
    source.allowedFields.flatMap((f) => FIELD_COLUMNS[f] ?? []),
  );
  const records: RawRecord[] = [];
  const errors: { ref: string; reason: string }[] = [];
  rows.forEach((raw, index) => {
    const parsed = rowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        ref: `row ${index + 1}`,
        reason: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      });
      return;
    }
    const r = Object.fromEntries(
      Object.entries(parsed.data).filter(
        ([k]) => k === "id" || k === "source_url" || allowed.has(k),
      ),
    ) as z.infer<typeof rowSchema>;
    const hasPoint = r.latitude !== undefined && r.longitude !== undefined;
    records.push({
      sourceRecordId: r.id,
      sourceUrl: r.source_url,
      name: r.name,
      street: r.street,
      address: r.address,
      latitude: r.latitude,
      longitude: r.longitude,
      locationPrecision: hasPoint
        ? (r.location_precision ?? "unknown")
        : "unknown",
      phone: r.phone,
      website: r.website,
      openingHours: r.opening_hours,
      categories: r.categories
        ?.split(";")
        .map((c) => c.trim())
        .filter(Boolean),
    });
  });
  return { records, errors };
}
