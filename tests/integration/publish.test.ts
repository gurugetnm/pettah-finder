import "dotenv/config";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "@/lib/validations/test-database";
import { seed } from "../../prisma/seed";
import {
  applyPlan,
  backupFor,
  planPublication,
  rollback,
  type PlanItem,
} from "../../scripts/data-pipeline/publish";
import type {
  Candidate,
  Decision,
  Source,
} from "../../scripts/data-pipeline/schema";
vi.mock("server-only", () => ({}));
import { shopRepository } from "@/features/discovery/shops";

const url = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url, max: 2 }),
});

const osm: Source = {
  id: "osm",
  name: "OpenStreetMap",
  url: "https://www.openstreetmap.org/copyright",
  type: "osm",
  license: "ODbL-1.0",
  permissionStatus: "APPROVED",
  permissionEvidence: "ODbL",
  attribution: "© OpenStreetMap contributors",
  attributionUrl: "https://www.openstreetmap.org/copyright",
  reviewedAt: "2026-10-12",
  geographicScope: "Pettah",
  allowedFields: [],
  publicationPermitted: true,
  automatedCollection: true,
};

let n = 0;
function candidate(overrides: Partial<Candidate> = {}): Candidate {
  const rid = `node/99000${++n}`;
  return {
    id: `osm:${rid}`,
    source: "osm",
    sourceRecordId: rid,
    sourceUrl: `https://www.openstreetmap.org/${rid}`,
    name: `TEST FIXTURE Import ${n}`,
    normalizedName: `test fixture import ${n}`,
    streetName: "1st Cross Street",
    streetSlug: "1st-cross-street",
    latitude: 6.9357,
    longitude: 79.8509,
    categories: ["mobile-accessories"],
    products: [],
    contactPhone: "+94112345678",
    locationPrecision: "exact",
    collectedAt: "2026-10-12T00:00:00.000Z",
    flags: [],
    provenance: {
      sourceLicense: "ODbL-1.0",
      originalRecordReference: rid,
      sourceDatasetVersion: "2026-10-01T00:00:00Z",
    },
    ...overrides,
  };
}
const approve = (extra: Partial<Decision> = {}): Decision => ({
  decision: "approved",
  independentlyVerified: true,
  evidence: "TEST FIXTURE site visit",
  reviewer: "test",
  reviewedAt: "2026-10-12T00:00:00.000Z",
  ...extra,
});

async function publish(
  candidates: Candidate[],
  decisions: Record<string, Decision>,
  sources = [osm],
) {
  const plan = await planPublication(db, { candidates, decisions, sources });
  await applyPlan(db, plan, new Date());
  return plan;
}
const byId = (plan: PlanItem[], id: string) =>
  plan.find((p) => ("candidate" in p ? p.candidate.id : p.id) === id)!;
const counts = () =>
  Promise.all([
    db.shop.count(),
    db.shopSource.count(),
    db.shopCategory.count(),
  ]);

async function cleanup() {
  await db.shop.deleteMany({ where: { name: { startsWith: "TEST FIXTURE" } } });
}

beforeAll(async () => {
  await seed(db);
  await cleanup();
});
afterEach(cleanup);
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("publication", () => {
  it("dry-run planning does not mutate the database", async () => {
    const before = await counts();
    const c = candidate();
    const plan = await planPublication(db, {
      candidates: [c],
      decisions: { [c.id]: approve() },
      sources: [osm],
    });
    expect(plan[0].action).toBe("insert");
    expect(await counts()).toEqual(before);
  });

  it("publishes an approved, independently verified record with provenance", async () => {
    const c = candidate();
    const plan = await publish([c], { [c.id]: approve() });
    const item = plan[0] as Extract<PlanItem, { action: "insert" }>;
    const shop = await shopRepository(db).detail(item.slug);
    expect(shop).toMatchObject({
      name: c.name,
      contactPhone: "+94112345678",
      street: { slug: "1st-cross-street" },
    });
    expect(shop?.categories.map((x) => x.category.slug)).toEqual([
      "mobile-accessories",
    ]);
    expect(Number(shop?.latitude)).toBeCloseTo(6.9357);
    const source = await db.shopSource.findUniqueOrThrow({
      where: {
        source_sourceRecordId: {
          source: "osm",
          sourceRecordId: c.sourceRecordId,
        },
      },
    });
    expect(source).toMatchObject({
      license: "ODbL-1.0",
      attribution: "© OpenStreetMap contributors",
      locationPrecision: "exact",
      verificationEvidence: "TEST FIXTURE site visit",
    });
    expect(source.history).toHaveLength(1);
  });

  it("keeps approved but unverified records as hidden drafts and skips rejected/unreviewed ones", async () => {
    const draft = candidate();
    const rejected = candidate();
    const pending = candidate();
    const plan = await publish([draft, rejected, pending], {
      [draft.id]: approve({
        independentlyVerified: false,
        evidence: undefined,
      }),
      [rejected.id]: approve({ decision: "rejected" }),
    });
    expect(byId(plan, rejected.id)).toMatchObject({
      action: "skipped",
      reason: "rejected in review",
    });
    expect(byId(plan, pending.id)).toMatchObject({
      action: "skipped",
      reason: "awaiting review",
    });
    const stored = await db.shop.findFirstOrThrow({
      where: { name: draft.name },
    });
    expect(stored).toMatchObject({
      verificationStatus: "UNVERIFIED",
      publicationStatus: "DRAFT",
    });
    expect(await shopRepository(db).detail(stored.slug)).toBeNull();
    expect(
      await db.shop.count({
        where: { name: { in: [rejected.name, pending.name] } },
      }),
    ).toBe(0);
  });

  it("is idempotent on repeated publication", async () => {
    const c = candidate();
    await publish([c], { [c.id]: approve() });
    const after = await counts();
    const again = await publish([c], { [c.id]: approve() });
    expect(again[0].action).toBe("unchanged");
    expect(await counts()).toEqual(after);
  });

  it("never overwrites a verified shop with different import data", async () => {
    const c = candidate();
    await publish([c], { [c.id]: approve() });
    const changed = { ...c, contactPhone: "+94770000000" };
    const plan = await publish([changed], {
      [c.id]: approve({ independentlyVerified: false, evidence: undefined }),
    });
    expect(plan[0]).toMatchObject({ action: "conflict" });
    expect(
      (await db.shop.findFirstOrThrow({ where: { name: c.name } }))
        .contactPhone,
    ).toBe("+94112345678");
  });

  it("updates unverified drafts without erasing details missing from the new data", async () => {
    const c = candidate();
    const draft = approve({
      independentlyVerified: false,
      evidence: undefined,
    });
    await publish([c], { [c.id]: draft });
    const plan = await publish(
      [{ ...c, contactPhone: undefined, categories: ["electronics"] }],
      { [c.id]: draft },
    );
    expect(plan[0]).toMatchObject({
      action: "update",
      changes: ["categories"],
    });
    const shop = await db.shop.findFirstOrThrow({
      where: { name: c.name },
      include: { categories: true },
    });
    expect(shop.contactPhone).toBe("+94112345678");
    expect(shop.categories.map((x) => x.categoryId)).toEqual(["electronics"]);
  });

  it("refuses unlicensed, out-of-area, unassigned, unmapped and duplicate records", async () => {
    const pendingSource = candidate({ source: "peta-lk" });
    const outside = candidate({ flags: ["out_of_area"] });
    const noStreet = candidate({ streetSlug: undefined });
    const unmapped = candidate({ categories: [], flags: ["category_unknown"] });
    const dupe = candidate({ flags: ["possible_duplicate"] });
    const all = [pendingSource, outside, noStreet, unmapped, dupe];
    const sources = [
      osm,
      {
        ...osm,
        id: "peta-lk",
        permissionStatus: "PERMISSION_REQUIRED" as const,
      },
    ];
    const plan = await planPublication(db, {
      candidates: all,
      decisions: Object.fromEntries(all.map((c) => [c.id, approve()])),
      sources,
    });
    expect(plan.map((p) => p.action)).toEqual([
      "refused",
      "refused",
      "refused",
      "refused",
      "refused",
    ]);
    expect(byId(plan, pendingSource.id)).toMatchObject({
      reason: expect.stringMatching(/PERMISSION_REQUIRED/),
    });

    const resolved = await planPublication(db, {
      candidates: [noStreet, unmapped, dupe],
      decisions: {
        [noStreet.id]: approve({ streetSlug: "sea-street" }),
        [unmapped.id]: approve({ categories: ["jewellery"] }),
        [dupe.id]: approve({ duplicateResolution: "distinct" }),
      },
      sources,
    });
    expect(resolved.map((p) => p.action)).toEqual([
      "insert",
      "insert",
      "insert",
    ]);
  });

  it("does not store representative centres as shop coordinates", async () => {
    const c = candidate({ locationPrecision: "representative" });
    await publish([c], { [c.id]: approve() });
    expect(
      (await db.shop.findFirstOrThrow({ where: { name: c.name } })).latitude,
    ).toBeNull();
  });

  it("flags a possible duplicate of an existing manually maintained shop", async () => {
    await db.shop.create({
      data: {
        name: "TEST FIXTURE Manual",
        slug: "test-fixture-manual",
        streetId: "1st-cross-street",
      },
    });
    const c = candidate({
      name: "TEST FIXTURE  manual",
      normalizedName: "test fixture manual",
    });
    const plan = await planPublication(db, {
      candidates: [c],
      decisions: { [c.id]: approve() },
      sources: [osm],
    });
    expect(plan[0]).toMatchObject({
      action: "conflict",
      reason: expect.stringMatching(/test-fixture-manual/),
    });
  });

  it("rolls back the whole batch when one write fails", async () => {
    const good = candidate();
    const bad = candidate();
    const plan = await planPublication(db, {
      candidates: [good, bad],
      decisions: { [good.id]: approve(), [bad.id]: approve() },
      sources: [osm],
    });
    (plan[1] as Extract<PlanItem, { action: "insert" }>).categoryIds = [
      "missing-category",
    ];
    const before = await counts();
    await expect(applyPlan(db, plan, new Date())).rejects.toThrow();
    expect(await counts()).toEqual(before);
  });

  it("restores overwritten drafts and withdraws inserted shops on rollback", async () => {
    const c = candidate();
    const draft = approve({
      independentlyVerified: false,
      evidence: undefined,
    });
    await publish([c], { [c.id]: draft });
    const added = candidate();
    const plan = await planPublication(db, {
      candidates: [{ ...c, contactPhone: "+94770000000" }, added],
      decisions: { [c.id]: draft, [added.id]: approve() },
      sources: [osm],
    });
    const backup = await backupFor(db, plan, new Date());
    await applyPlan(db, plan, new Date());
    expect(
      (await db.shop.findFirstOrThrow({ where: { name: added.name } }))
        .publicationStatus,
    ).toBe("PUBLISHED");
    await rollback(db, backup);
    expect(
      (await db.shop.findFirstOrThrow({ where: { name: c.name } }))
        .contactPhone,
    ).toBe("+94112345678");
    expect(
      (await db.shop.findFirstOrThrow({ where: { name: added.name } }))
        .publicationStatus,
    ).toBe("DRAFT");
  });
});
