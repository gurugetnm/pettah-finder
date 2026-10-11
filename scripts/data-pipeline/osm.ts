import { z } from "zod";
import type { Boundary, Source } from "./schema";
import type { RawRecord } from "./process";

export const OSM_LICENSE = "ODbL-1.0";

export function overpassQuery({ bbox }: Boundary, timeoutSeconds = 25) {
  const box = [bbox.south, bbox.west, bbox.north, bbox.east].join(",");
  // `out center` gives ways/relations a representative point; tags only, no contributor metadata.
  return `[out:json][timeout:${timeoutSeconds}][maxsize:16777216];\nnwr["shop"](${box});\nout tags center 5000;`;
}

export type FetchDeps = {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
};
export type FetchOptions = {
  source: Source;
  endpoint: string;
  query: string;
  contact: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRetries?: number;
};

const RETRYABLE = new Set([429, 502, 503, 504]);
const MAX_RETRY_AFTER_MS = 120_000;

/** One bounded, identified, sequential Overpass request with a fixed retry cap. */
export async function fetchOverpass(
  options: FetchOptions,
  deps: FetchDeps = {},
) {
  const {
    source,
    endpoint,
    query,
    contact,
    timeoutMs = 60_000,
    maxBytes = 20 * 1024 * 1024,
    maxRetries = 2,
  } = options;
  const doFetch = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  const log = deps.log ?? (() => {});
  // Fixed allowlist from the version-controlled manifest: no arbitrary URL fetching.
  if (!source.allowedEndpoints?.includes(endpoint))
    throw new Error(
      `Endpoint ${endpoint} is not in the ${source.id} manifest allowlist`,
    );
  if (!contact.trim())
    throw new Error(
      "A contact (URL or email) is required to identify requests",
    );

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await doFetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": `PettahFinder-DataPipeline/0.1 (${contact})`,
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        signal: controller.signal,
        redirect: "error",
      });
      if (response.ok)
        return parseJsonLimited(await readLimited(response, maxBytes));
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(`Overpass request timed out after ${timeoutMs} ms`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
    await response.body?.cancel().catch(() => {});
    if (!RETRYABLE.has(response.status) || attempt >= maxRetries)
      throw new Error(
        `Overpass responded ${response.status} ${response.statusText}; giving up after ${attempt + 1} attempt(s)`,
      );
    const wait = retryDelay(response.headers.get("retry-after"), attempt);
    if (wait > MAX_RETRY_AFTER_MS)
      throw new Error(
        `Overpass asked to retry after ${Math.round(wait / 1000)} s; try again later`,
      );
    log(
      `Overpass ${response.status}; waiting ${Math.round(wait / 1000)} s before retry ${attempt + 1}/${maxRetries}`,
    );
    await sleep(wait);
  }
}

export function retryDelay(retryAfter: string | null, attempt: number) {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(retryAfter);
    if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  }
  return 5000 * 2 ** attempt;
}

async function readLimited(response: Response, maxBytes: number) {
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes)
    throw new Error("Overpass response exceeds size limit");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("Overpass response exceeds size limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function parseJsonLimited(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Overpass returned a response that is not valid JSON");
  }
}

const coordinate = z.object({ lat: z.number(), lon: z.number() });
const elementSchema = z.object({
  type: z.enum(["node", "way", "relation"]),
  id: z.number().int().positive(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: coordinate.optional(),
  tags: z.record(z.string(), z.string()).optional(),
});
export const overpassResponseSchema = z.object({
  osm3s: z
    .object({ timestamp_osm_base: z.string().max(40).optional() })
    .optional(),
  remark: z.string().optional(),
  elements: z.array(z.unknown()).max(20000),
});

/** Convert an Overpass JSON document into source records, one per element, keeping OSM identity. */
export function parseOverpass(json: unknown) {
  const doc = overpassResponseSchema.safeParse(json);
  if (!doc.success)
    throw new Error("Malformed Overpass response: missing elements array");
  // Overpass reports server-side timeouts/limits as a remark with partial data.
  if (doc.data.remark && /error|timed out|out of memory/i.test(doc.data.remark))
    throw new Error(
      `Overpass reported an incomplete result: ${doc.data.remark.slice(0, 200)}`,
    );
  const records: RawRecord[] = [];
  const errors: { ref: string; reason: string }[] = [];
  for (const raw of doc.data.elements) {
    const parsed = elementSchema.safeParse(raw);
    if (!parsed.success) {
      const r = raw as { type?: unknown; id?: unknown };
      errors.push({
        ref: `${String(r?.type)}/${String(r?.id)}`,
        reason: "malformed element",
      });
      continue;
    }
    const el = parsed.data;
    const tags = el.tags ?? {};
    const point =
      el.type === "node"
        ? el.lat !== undefined && el.lon !== undefined
          ? { lat: el.lat, lon: el.lon }
          : undefined
        : el.center;
    const street = tags["addr:street"];
    const address = [tags["addr:housenumber"], street, tags["addr:city"]]
      .filter(Boolean)
      .join(", ");
    records.push({
      sourceRecordId: `${el.type}/${el.id}`,
      sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
      name: tags.name ?? tags["name:en"],
      street,
      address: address || undefined,
      latitude: point?.lat,
      longitude: point?.lon,
      // A shop node is a mapped point; a way/relation centre is only representative. Neither is a surveyed entrance.
      locationPrecision: point
        ? el.type === "node"
          ? "exact"
          : "representative"
        : "unknown",
      phone: tags.phone ?? tags["contact:phone"],
      website: tags.website ?? tags["contact:website"],
      openingHours: tags.opening_hours,
      shopTag: tags.shop,
      rawTags: tags,
    });
  }
  return {
    records,
    errors,
    datasetVersion: doc.data.osm3s?.timestamp_osm_base,
  };
}
