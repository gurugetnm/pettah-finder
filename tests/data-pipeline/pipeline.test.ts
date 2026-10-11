import { describe, expect, it, vi } from "vitest";
import { compare, findDuplicates } from "../../scripts/data-pipeline/dedupe";
import {
  parseCsv,
  rowsToRecords,
} from "../../scripts/data-pipeline/file-import";
import { readJson, safeInputPath } from "../../scripts/data-pipeline/files";
import {
  cleanName,
  comparisonKey,
  inBoundary,
  mapCategories,
  normalizePhone,
  normalizeWebsite,
  streetMatcher,
  validCoordinate,
} from "../../scripts/data-pipeline/normalize";
import {
  fetchOverpass,
  overpassQuery,
  parseOverpass,
  retryDelay,
} from "../../scripts/data-pipeline/osm";
import {
  collectionBlocker,
  publicationBlocker,
} from "../../scripts/data-pipeline/permissions";
import {
  processBatches,
  type Context,
} from "../../scripts/data-pipeline/process";
import {
  boundarySchema,
  sourceSchema,
  type Candidate,
  type Source,
} from "../../scripts/data-pipeline/schema";

const boundary = boundarySchema.parse(readJson("data/manifests/boundary.json"));
const categoryMap = (
  readJson("data/mappings/categories.json") as {
    shop: Record<string, string[]>;
  }
).shop;
const aliases = (
  readJson("data/mappings/street-aliases.json") as {
    streets: Record<string, string[]>;
  }
).streets;
const ctx: Context = {
  boundary,
  categoryMap,
  matchStreet: streetMatcher(aliases),
};

const osm: Source = sourceSchema.parse({
  id: "osm",
  name: "OpenStreetMap",
  url: "https://www.openstreetmap.org/copyright",
  type: "osm",
  license: "ODbL-1.0",
  permissionStatus: "APPROVED",
  permissionEvidence: "ODbL",
  attribution: "© OpenStreetMap contributors",
  reviewedAt: "2026-10-12",
  geographicScope: "Pettah",
  allowedFields: [],
  publicationPermitted: true,
  automatedCollection: true,
  allowedEndpoints: ["https://overpass-api.de/api/interpreter"],
});

function candidate(overrides: Partial<Candidate>): Candidate {
  return {
    id: "osm:node/1",
    source: "osm",
    sourceRecordId: "node/1",
    name: "Shop",
    normalizedName: "shop",
    categories: [],
    products: [],
    locationPrecision: "exact",
    collectedAt: "2026-10-12T00:00:00.000Z",
    flags: [],
    provenance: { sourceLicense: "ODbL-1.0", originalRecordReference: "x" },
    ...overrides,
  };
}

describe("OSM parsing", () => {
  const fixture = parseOverpass(readJson("data/fixtures/overpass-pettah.json"));
  const byId = (id: string) =>
    fixture.records.find((r) => r.sourceRecordId === id)!;

  it("keeps element identity and picks node, way and relation geometry correctly", () => {
    expect(byId("node/900000001")).toMatchObject({
      latitude: 6.93568,
      longitude: 79.85094,
      locationPrecision: "exact",
    });
    expect(byId("way/900000003")).toMatchObject({
      latitude: 6.9372,
      locationPrecision: "representative",
    });
    expect(byId("relation/900000004")).toMatchObject({
      longitude: 79.85412,
      locationPrecision: "representative",
    });
    expect(byId("way/900000008")).toMatchObject({
      latitude: undefined,
      locationPrecision: "unknown",
    });
    expect(byId("node/900000001").sourceUrl).toBe(
      "https://www.openstreetmap.org/node/900000001",
    );
    expect(fixture.datasetVersion).toBe("2026-10-01T00:00:00Z");
  });

  it("preserves raw tags and quarantines malformed elements without failing the batch", () => {
    expect(byId("node/900000007").rawTags).toMatchObject({
      shop: "pawnbroker",
    });
    expect(fixture.errors).toEqual([
      { ref: "node/bad", reason: "malformed element" },
    ]);
  });

  it("rejects malformed responses and server-side errors", () => {
    expect(() => parseOverpass({ nope: true })).toThrow(/Malformed/);
    expect(() => parseOverpass("<html>")).toThrow(/Malformed/);
    expect(() =>
      parseOverpass({ elements: [], remark: "runtime error: Query timed out" }),
    ).toThrow(/incomplete/);
  });

  it("builds a bounded bbox query without contributor metadata", () => {
    const q = overpassQuery(boundary);
    expect(q).toContain("(6.932,79.847,6.943,79.861)");
    expect(q).toMatch(/\[timeout:25\]/);
    expect(q).not.toContain("meta");
  });
});

describe("Overpass fetching", () => {
  const ok = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200 });
  const base = {
    source: osm,
    endpoint: "https://overpass-api.de/api/interpreter",
    query: "q",
    contact: "https://example.org",
  };

  it("identifies itself and refuses endpoints outside the manifest allowlist", async () => {
    const fetchMock = vi.fn(async () => ok({ elements: [] }));
    await fetchOverpass(base, { fetch: fetchMock });
    const init = (
      fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect((init.headers as Record<string, string>)["User-Agent"]).toContain(
      "https://example.org",
    );
    await expect(
      fetchOverpass(
        { ...base, endpoint: "https://evil.example/api" },
        { fetch: fetchMock },
      ),
    ).rejects.toThrow(/allowlist/);
    await expect(
      fetchOverpass({ ...base, contact: " " }, { fetch: fetchMock }),
    ).rejects.toThrow(/contact/);
  });

  it("honours Retry-After and stops after a fixed retry cap", async () => {
    const sleep = vi.fn(async () => {});
    const fetchMock = vi.fn(
      async () =>
        new Response("busy", { status: 429, headers: { "Retry-After": "3" } }),
    );
    await expect(
      fetchOverpass({ ...base, maxRetries: 2 }, { fetch: fetchMock, sleep }),
    ).rejects.toThrow(/429.*3 attempt/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(3000);
  });

  it("does not retry client errors and gives up on very long Retry-After", async () => {
    const bad = vi.fn(async () => new Response("bad", { status: 400 }));
    await expect(fetchOverpass(base, { fetch: bad })).rejects.toThrow(/400/);
    expect(bad).toHaveBeenCalledTimes(1);
    const later = vi.fn(
      async () =>
        new Response("", { status: 503, headers: { "Retry-After": "3600" } }),
    );
    await expect(
      fetchOverpass(base, { fetch: later, sleep: async () => {} }),
    ).rejects.toThrow(/try again later/);
  });

  it("recovers after a transient failure with exponential backoff", async () => {
    const responses = [new Response("", { status: 504 }), ok({ elements: [] })];
    const sleep = vi.fn(async () => {});
    await expect(
      fetchOverpass(base, { fetch: async () => responses.shift()!, sleep }),
    ).resolves.toEqual({ elements: [] });
    expect(sleep).toHaveBeenCalledWith(5000);
    expect(retryDelay(null, 2)).toBe(20000);
  });

  it("enforces size limits, timeouts and JSON validity", async () => {
    await expect(
      fetchOverpass(
        { ...base, maxBytes: 10 },
        { fetch: async () => ok({ elements: [1, 2, 3, 4] }) },
      ),
    ).rejects.toThrow(/size limit/);
    await expect(
      fetchOverpass(base, {
        fetch: async () => new Response("<html>", { status: 200 }),
      }),
    ).rejects.toThrow(/not valid JSON/);
    const hang = (_: unknown, init?: RequestInit) =>
      new Promise<Response>((_r, reject) =>
        init?.signal?.addEventListener("abort", () =>
          reject(new Error("aborted")),
        ),
      );
    await expect(
      fetchOverpass(
        { ...base, timeoutMs: 10 },
        { fetch: hang as typeof fetch },
      ),
    ).rejects.toThrow(/timed out/);
  });
});

describe("normalization", () => {
  it("cleans names without destroying punctuation or non-Latin scripts", () => {
    expect(cleanName("  A & B   Traders (Pvt) Ltd. ")).toBe(
      "A & B Traders (Pvt) Ltd.",
    );
    expect(cleanName("ශ්‍රී  ලංකා")).toBe("ශ්‍රී ලංකා");
    expect(cleanName("   ")).toBeUndefined();
    expect(comparisonKey("ＡＢＣ  Stores")).toBe("abc stores");
  });

  it("matches only documented street aliases", () => {
    const match = streetMatcher(aliases);
    expect(match("First Cross Street")).toBe("1st-cross-street");
    expect(match("1st cross st.")).toBe("1st-cross-street");
    expect(match("Second Cross Street")).toBe("2nd-cross-street");
    expect(match("Cross Street")).toBeUndefined();
    expect(match("3rd Cross Street")).toBeUndefined();
  });

  it("normalizes Sri Lankan phone formats without inventing country codes", () => {
    expect(normalizePhone("011 234 5678")).toEqual({
      phone: "+94112345678",
      issue: undefined,
    });
    expect(normalizePhone("+94 (77) 123-4567")).toEqual({
      phone: "+94771234567",
      issue: undefined,
    });
    expect(normalizePhone("0094112345678").phone).toBe("+94112345678");
    expect(normalizePhone("112345678")).toEqual({
      issue: "phone_unrecognized",
    });
    expect(normalizePhone("+44 20 7946 0958")).toEqual({
      issue: "phone_unrecognized",
    });
    expect(normalizePhone("0112345678;0771234567")).toEqual({
      phone: "+94112345678",
      issue: "multiple_phones",
    });
    expect(normalizePhone(undefined)).toEqual({});
  });

  it("validates websites and coordinates against the study area", () => {
    expect(normalizeWebsite("example.com").website).toBe(
      "https://example.com/",
    );
    expect(normalizeWebsite("javascript:alert(1)").issue).toBe(
      "website_invalid",
    );
    expect(validCoordinate(6.93, 79.85)).toBe(true);
    expect(validCoordinate(91, 79.85)).toBe(false);
    expect(validCoordinate(Number.NaN, 79.85)).toBe(false);
    expect(inBoundary(6.9357, 79.8509, boundary)).toBe(true);
    expect(inBoundary(6.95, 79.87, boundary)).toBe(false);
  });

  it("maps known shop tags and sends unknown ones to review", () => {
    expect(mapCategories("mobile_phone", categoryMap)).toEqual({
      categories: ["mobile-accessories"],
      issue: undefined,
    });
    expect(mapCategories("clothes;shoes", categoryMap).categories).toEqual([
      "clothing",
      "footwear",
    ]);
    expect(mapCategories("pawnbroker", categoryMap)).toEqual({
      categories: [],
      issue: "category_unknown",
    });
    expect(mapCategories(undefined, categoryMap).issue).toBe(
      "category_unknown",
    );
  });
});

describe("processing", () => {
  const records = parseOverpass(
    readJson("data/fixtures/overpass-pettah.json"),
  ).records;
  const result = processBatches(
    [{ source: osm, records, collectedAt: "2026-10-12T00:00:00.000Z" }],
    ctx,
  );
  const get = (id: string) => result.candidates.find((c) => c.id === id)!;

  it("never names unnamed features and never infers products", () => {
    expect(result.unnamed).toEqual(["osm:node/900000005"]);
    expect(result.candidates.every((c) => c.products.length === 0)).toBe(true);
  });

  it("flags out-of-area, unknown categories and missing locations; leaves missing data missing", () => {
    expect(get("osm:node/900000006").flags).toContain("out_of_area");
    expect(get("osm:node/900000007").flags).toContain("category_unknown");
    expect(get("osm:way/900000008")).toMatchObject({
      latitude: undefined,
      flags: ["location_missing"],
    });
    expect(get("osm:way/900000003").contactPhone).toBeUndefined();
    expect(get("osm:node/900000001")).toMatchObject({
      contactPhone: "+94112345678",
      contactPhoneRaw: "011 234 5678",
      streetSlug: "1st-cross-street",
    });
  });

  it("quarantines invalid coordinates and treats repeated source identities as one record", () => {
    const twice = processBatches(
      [
        {
          source: osm,
          collectedAt: "2026-10-12T00:00:00.000Z",
          records: [
            {
              sourceRecordId: "node/1",
              name: "A",
              latitude: 6.935,
              longitude: 79.85,
              locationPrecision: "exact",
              shopTag: "toys",
            },
            {
              sourceRecordId: "node/1",
              name: "A",
              latitude: 6.935,
              longitude: 79.85,
              locationPrecision: "exact",
              shopTag: "toys",
            },
            {
              sourceRecordId: "node/2",
              name: "B",
              latitude: 200,
              longitude: 79.85,
              locationPrecision: "exact",
              shopTag: "toys",
            },
          ],
        },
      ],
      ctx,
    );
    expect(twice.summary).toMatchObject({
      valid: 1,
      exactDuplicates: 1,
      quarantined: 1,
    });
    expect(twice.quarantine[0].reasons).toEqual(["invalid coordinates"]);
  });
});

describe("duplicate detection", () => {
  const a = candidate({
    id: "a",
    normalizedName: "lanka mobile",
    latitude: 6.9357,
    longitude: 79.8509,
    streetSlug: "1st-cross-street",
    contactPhone: "+94112345678",
  });

  it("flags the same shop recorded twice as a probable duplicate with reasons", () => {
    const b = { ...a, id: "b", latitude: 6.93571 };
    const r = compare(a, b);
    expect(r.outcome).toBe("probable_duplicate");
    expect(r.reasons.join()).toMatch(
      /same normalized name.*same phone.*m apart.*same street/,
    );
  });

  it("keeps same-name branches and similar names far apart distinct", () => {
    const branch = {
      ...a,
      id: "b",
      latitude: 6.9397,
      longitude: 79.8541,
      streetSlug: "sea-street",
      contactPhone: "+94112999999",
    };
    expect(compare(a, branch).outcome).toBe("distinct");
    expect(
      compare(a, { ...branch, normalizedName: "lanka mobile centre" }).outcome,
    ).toBe("distinct");
  });

  it("does not merge on proximity alone and sends same-phone/different-name to review", () => {
    expect(
      compare(a, {
        ...a,
        id: "b",
        normalizedName: "royal textiles",
        contactPhone: undefined,
      }).outcome,
    ).toBe("distinct");
    expect(
      compare(a, { ...a, id: "b", normalizedName: "royal textiles" }).outcome,
    ).toBe("ambiguous");
  });

  it("lowers confidence for conflicting source records", () => {
    const conflicting = {
      ...a,
      id: "b",
      contactPhone: "+94770000000",
      latitude: 6.9361,
    };
    expect(compare(a, conflicting).outcome).toBe("ambiguous");
    expect(findDuplicates([a, conflicting])[0].reasons).toContain(
      "different phones (-0.1)",
    );
  });
});

describe("licensing and permissions", () => {
  const base = { ...osm, allowedEndpoints: undefined };
  it("accepts an approved manifest", () => {
    expect(collectionBlocker(osm)).toBeNull();
    expect(publicationBlocker(osm)).toBeNull();
  });
  it("rejects approved manifests missing license, evidence or attribution", () => {
    expect(sourceSchema.safeParse({ ...base, license: "" }).success).toBe(
      false,
    );
    expect(
      sourceSchema.safeParse({ ...base, permissionEvidence: "" }).success,
    ).toBe(false);
    expect(sourceSchema.safeParse({ ...base, attribution: "" }).success).toBe(
      false,
    );
  });
  it("blocks permission-required, unlisted and non-publishable sources", () => {
    const pending = {
      ...osm,
      permissionStatus: "PERMISSION_REQUIRED" as const,
    };
    expect(collectionBlocker(pending)).toMatch(/PERMISSION_REQUIRED/);
    expect(publicationBlocker(pending)).toMatch(/PERMISSION_REQUIRED/);
    expect(publicationBlocker(undefined)).toMatch(/not listed/);
    expect(publicationBlocker({ ...osm, publicationPermitted: false })).toMatch(
      /does not permit/,
    );
    expect(publicationBlocker({ ...osm, attribution: "" })).toMatch(
      /attribution/,
    );
    expect(collectionBlocker({ ...osm, automatedCollection: false })).toMatch(
      /automated/,
    );
  });
  it("keeps the committed directory candidates dormant", () => {
    const sources = (
      readJson("data/manifests/sources.json") as { sources: Source[] }
    ).sources;
    for (const s of sources.filter((x) => x.type === "directory")) {
      expect(s.permissionStatus).toBe("PERMISSION_REQUIRED");
      expect(collectionBlocker(sourceSchema.parse(s))).not.toBeNull();
    }
  });
  it("refuses boundaries larger than a neighbourhood", () => {
    expect(
      boundarySchema.safeParse({
        ...boundary,
        bbox: { south: 6.8, west: 79.8, north: 7.0, east: 79.95 },
      }).success,
    ).toBe(false);
  });
});

describe("licensed file import", () => {
  const fileSource: Source = {
    ...osm,
    id: "owner-csv",
    type: "file",
    allowedFields: ["name", "street", "phone", "categories"],
  };
  it("parses quoted CSV and keeps only manifest-allowed columns", () => {
    const rows = parseCsv(
      'id,name,street,phone,website,categories\r\n1,"Lanka ""Best"" Shop",Sea Street,0112345678,https://x.example,jewellery\n',
    );
    expect(rows[0].name).toBe('Lanka "Best" Shop');
    const { records, errors } = rowsToRecords(rows, fileSource);
    expect(errors).toEqual([]);
    expect(records[0]).toMatchObject({
      sourceRecordId: "1",
      phone: "0112345678",
      categories: ["jewellery"],
      website: undefined,
    });
  });
  it("reports malformed rows individually", () => {
    const { records, errors } = rowsToRecords(
      [
        { id: "" },
        { id: "2", name: "Ok", latitude: "abc" },
        { id: "3", name: "Fine" },
      ],
      fileSource,
    );
    expect(records.map((r) => r.sourceRecordId)).toEqual(["3"]);
    expect(errors).toHaveLength(2);
  });
  it("rejects unterminated CSV quotes", () => {
    expect(() => parseCsv('id,name\n1,"open')).toThrow(/unterminated/);
  });
});

describe("input file safety", () => {
  it("blocks path traversal and unexpected extensions", () => {
    expect(() => safeInputPath("../../etc/passwd", [".json"])).toThrow();
    expect(() => safeInputPath("package.json", [".csv"])).toThrow(
      /must be one of/,
    );
    expect(
      safeInputPath("data/fixtures/overpass-pettah.json", [".json"]),
    ).toMatch(/overpass-pettah\.json$/);
  });
});
