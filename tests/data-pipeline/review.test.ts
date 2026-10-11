import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sanitizeFileName } from "../../scripts/data-pipeline/files";
import { publishBlocker } from "../../scripts/data-pipeline/publish";
import {
  csvCell,
  filterCandidates,
  recordDecision,
} from "../../scripts/data-pipeline/review";
import type { Candidate } from "../../scripts/data-pipeline/schema";

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

describe("export safety", () => {
  it("sanitizes file names and neutralizes spreadsheet formulas", () => {
    expect(sanitizeFileName("../../evil name.json")).toBe("evil_name.json");
    expect(csvCell("=HYPERLINK(1)")).toBe(`"'=HYPERLINK(1)"`);
    expect(csvCell("+94112345678")).toBe(`"'+94112345678"`);
    expect(csvCell('say "hi"')).toBe(`"say ""hi"""`);
  });
});

describe("review decisions", () => {
  it("persists sorted, validated decisions and filters candidates", () => {
    const file = join(mkdtempSync(join(tmpdir(), "review-")), "decisions.json");
    writeFileSync(file, '{"decisions":{}}');
    const decision = {
      decision: "approved" as const,
      independentlyVerified: false,
      reviewer: "dev",
      reviewedAt: "2026-10-12T00:00:00.000Z",
    };
    const saved = recordDecision(
      recordDecision({}, "osm:node/2", decision, file),
      "osm:node/1",
      decision,
      file,
    );
    expect(
      Object.keys(JSON.parse(readFileSync(file, "utf8")).decisions),
    ).toEqual(["osm:node/1", "osm:node/2"]);
    expect(() =>
      recordDecision(
        {},
        "x",
        { ...decision, independentlyVerified: true },
        file,
      ),
    ).toThrow(/evidence/);
    const list = [
      candidate({ id: "osm:node/1" }),
      candidate({ id: "osm:node/3", flags: ["out_of_area"] }),
    ];
    expect(filterCandidates(list, saved, "pending").map((c) => c.id)).toEqual([
      "osm:node/3",
    ]);
    expect(
      filterCandidates(list, saved, "out-of-area").map((c) => c.id),
    ).toEqual(["osm:node/3"]);
  });
});

describe("production safety", () => {
  const local = { DATABASE_URL: "postgresql://u@127.0.0.1:5432/pettah_dev" };
  const remote = {
    DATABASE_URL: "postgresql://u:p@db.example.com:5432/pettah",
  };
  it("allows dry runs anywhere and local applies only outside CI", () => {
    expect(publishBlocker(remote, { apply: false })).toBeNull();
    expect(publishBlocker(local, { apply: true })).toBeNull();
    expect(publishBlocker({ ...local, CI: "true" }, { apply: true })).toMatch(
      /CI/,
    );
  });
  it("requires explicit opt-in and host confirmation for remote or production databases", () => {
    expect(publishBlocker(remote, { apply: true })).toMatch(
      /DATA_PUBLISH_ALLOW_REMOTE/,
    );
    expect(
      publishBlocker(
        { ...remote, DATA_PUBLISH_ALLOW_REMOTE: "yes" },
        { apply: true, confirmHost: "other" },
      ),
    ).toMatch(/confirm-host/);
    expect(
      publishBlocker(
        { ...remote, DATA_PUBLISH_ALLOW_REMOTE: "yes" },
        { apply: true, confirmHost: "db.example.com" },
      ),
    ).toBeNull();
    expect(
      publishBlocker({ ...local, NODE_ENV: "production" }, { apply: true }),
    ).toMatch(/DATA_PUBLISH_ALLOW_REMOTE/);
  });
});
