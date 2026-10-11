import "dotenv/config";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { testDatabaseUrl } from "@/lib/validations/test-database";
import { seed } from "../../prisma/seed";
vi.mock("server-only", () => ({}));
import { discoveryRepository } from "@/features/discovery/repository";
import { shopRepository } from "@/features/discovery/shops";
const url = testDatabaseUrl(
  process.env.TEST_DATABASE_URL,
  process.env.DATABASE_URL,
);
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url, max: 2 }),
});
const repo = discoveryRepository(db);
beforeAll(async () => {
  await seed(db);
});
afterAll(async () => {
  await db.$disconnect();
});
describe("PostgreSQL discovery", () => {
  it("seeds repeatedly without duplicates or real shop records", async () => {
    const counts = async () =>
      Promise.all([
        db.street.count(),
        db.category.count(),
        db.product.count(),
        db.productAlias.count(),
        db.streetCategory.count(),
        db.shop.count(),
      ]);
    const before = await counts();
    await seed(db);
    expect(await counts()).toEqual(before);
    expect(before.slice(0, 3)).toEqual([6, 12, 13]);
    expect(before[5]).toBe(0);
    expect(
      await db.street.count({
        where: {
          OR: [{ latitude: { not: null } }, { longitude: { not: null } }],
        },
      }),
    ).toBe(0);
  });
  it("resolves product aliases to categories and associated streets", async () => {
    for (const query of [
      "charger",
      "  CHARGER  ",
      "usb charger",
      "charging cable",
    ]) {
      const result = await repo.search(query);
      expect(result.categories.map((c) => c.slug)).toContain(
        "mobile-accessories",
      );
      expect(result.streets.map((s) => s.slug)).toContain("1st-cross-street");
    }
  });
  it("searches product names, category names and street names", async () => {
    expect((await repo.search("Phone charger")).streets[0].slug).toBe(
      "1st-cross-street",
    );
    expect(
      (await repo.search("Stationery")).streets.map((s) => s.slug),
    ).toContain("maliban-street");
    expect(
      (await repo.search("SEA STREET")).streets.map((s) => s.slug),
    ).toEqual(["sea-street"]);
  });
  it("handles empty, unknown and SQL-like input safely", async () => {
    for (const q of ["", "zzzzunknown", "%' OR 1=1 --"])
      expect((await repo.search(q)).streets).toEqual([]);
    expect(await db.street.count()).toBe(6);
  });
  it("filters, sorts and handles invalid or missing streets", async () => {
    expect(
      (await repo.streets("mobile-accessories")).map((s) => s.slug),
    ).toEqual(["1st-cross-street"]);
    const result = await repo.streets();
    expect(result.map((s) => s.name)).toEqual(
      [...result.map((s) => s.name)].sort(),
    );
    expect(await repo.street("unknown-street")).toBeNull();
    expect(await repo.street("../private")).toBeNull();
  });
  it("preserves foreign keys and unique slugs", async () => {
    await expect(
      db.street.create({
        data: {
          id: "duplicate",
          name: "duplicate",
          slug: "sea-street",
          description: "Test only",
          locationDescription: "Test only",
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
    await expect(
      db.streetCategory.create({
        data: { streetId: "does-not-exist", categoryId: "electronics" },
      }),
    ).rejects.toMatchObject({ code: "P2003" });
  });
  it("only exposes published verified shops, supports product/category filters and protects shops on street deletion", async () => {
    const rollback = new Error("rollback test fixtures");
    await expect(
      db.$transaction(async (tx) => {
        for (const [slug, publicationStatus, verificationStatus] of [
          ["test-fixture-public", "PUBLISHED", "VERIFIED"],
          ["test-fixture-draft", "DRAFT", "VERIFIED"],
          ["test-fixture-unverified", "PUBLISHED", "UNVERIFIED"],
        ] as const)
          await tx.shop.create({
            data: {
              id: slug,
              slug,
              name: `TEST FIXTURE ${slug}`,
              streetId: "1st-cross-street",
              publicationStatus,
              verificationStatus,
              categories: { create: { categoryId: "mobile-accessories" } },
              products: { create: { productId: "phone-charger" } },
            },
          });
        const shopRepo = shopRepository(tx as unknown as PrismaClient);
        expect(
          (
            await shopRepo.list({
              q: "charger",
              category: "mobile-accessories",
              street: "1st-cross-street",
            })
          ).map((s) => s.slug),
        ).toEqual(["test-fixture-public"]);
        const streetRepo = discoveryRepository(tx as unknown as PrismaClient);
        expect(
          (await streetRepo.street("1st-cross-street"))?.shops.map(
            (shop) => shop.slug,
          ),
        ).toEqual(["test-fixture-public"]);
        expect(await shopRepo.detail("test-fixture-draft")).toBeNull();
        expect(await shopRepo.detail("test-fixture-unverified")).toBeNull();
        expect(
          (await shopRepo.detail("test-fixture-public"))?.products[0].product
            .name,
        ).toBe("Phone charger");
        throw rollback;
      }),
    ).rejects.toBe(rollback);
    // Use a separate transaction: PostgreSQL aborts it after an FK violation.
    await expect(
      db.$transaction(async (tx) => {
        await tx.shop.create({
          data: {
            id: "test-delete-protection",
            slug: "test-delete-protection",
            name: "TEST FIXTURE",
            streetId: "sea-street",
          },
        });
        await tx.street.delete({ where: { slug: "sea-street" } });
      }),
    ).rejects.toMatchObject({ code: "P2003" });
    expect(await db.shop.count()).toBe(0);
  });
});
