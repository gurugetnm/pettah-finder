import type { Boundary } from "./schema";

/** Display form: Unicode-normalized, trimmed, single-spaced. Punctuation and case are kept. */
export function cleanName(value: string | undefined) {
  const cleaned = value
    ?.normalize("NFC")
    .replace(/[\u0000-\u001f\u007f]/gu, "")
    .replace(/\s+/gu, " ")
    .trim();
  return cleaned || undefined;
}

/** Comparison key only; never displayed. */
export function comparisonKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Map documented spellings to an existing street slug. Similar-but-undocumented names stay unmatched. */
export function streetMatcher(aliases: Record<string, string[]>) {
  const lookup = new Map<string, string>();
  for (const [slug, names] of Object.entries(aliases))
    for (const name of names) lookup.set(streetKey(name), slug);
  return (name: string | undefined) =>
    name ? lookup.get(streetKey(name)) : undefined;
}
const streetKey = (name: string) => comparisonKey(name).replace(/\.$/, "");

export type PhoneResult = { phone?: string; issue?: string };
/**
 * Sri Lankan numbers: +94 / 0094 followed by 9 digits, or national 0 + 9 digits
 * (the trunk 0 justifies +94). Anything else is left unnormalized.
 * A valid format is not proof the number belongs to this business.
 */
export function normalizePhone(raw: string | undefined): PhoneResult {
  if (!raw?.trim()) return {};
  const first = raw.split(/[;,/]/)[0];
  if (!/^[\s0-9+().-]+$/.test(first)) return { issue: "phone_unrecognized" };
  const digits = first.replace(/[\s().-]/g, "");
  const national =
    /^(?:\+94|0094)(\d{9})$/.exec(digits)?.[1] ??
    /^0(\d{9})$/.exec(digits)?.[1];
  if (!national) return { issue: "phone_unrecognized" };
  return {
    phone: `+94${national}`,
    issue: first === raw ? undefined : "multiple_phones",
  };
}

export function normalizeWebsite(raw: string | undefined) {
  const value = raw?.split(";")[0].trim();
  if (!value) return {};
  try {
    const url = new URL(
      /^https?:\/\//i.test(value) ? value : `https://${value}`,
    );
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      throw new Error();
    return { website: url.toString() };
  } catch {
    return { issue: "website_invalid" };
  }
}

export function validCoordinate(lat: unknown, lon: unknown): lat is number {
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

export function inBoundary(lat: number, lon: number, boundary: Boundary) {
  const { south, west, north, east } = boundary.bbox;
  const margin = boundary.safetyMarginMetres / 111_320; // degrees, close enough at this latitude
  return (
    lat >= south - margin &&
    lat <= north + margin &&
    lon >= west - margin &&
    lon <= east + margin
  );
}

export function distanceMetres(a: [number, number], b: [number, number]) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function mapCategories(
  shopTag: string | undefined,
  map: Record<string, string[]>,
) {
  if (!shopTag) return { categories: [], issue: "category_unknown" };
  const values = shopTag.split(";").map((v) => v.trim());
  const categories = [...new Set(values.flatMap((v) => map[v] ?? []))].sort();
  return {
    categories,
    issue: values.some((v) => !map[v]) ? "category_unknown" : undefined,
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
