import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import { comparisonKey, slugify } from "./normalize";
import { publicationBlocker } from "./permissions";
import type { Candidate, Decision, Source } from "./schema";

export const MAX_CHANGES_PER_RUN = 500;

type ShopFields = {
  name: string;
  streetId: string;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string | null;
  verificationStatus: "VERIFIED" | "UNVERIFIED";
  publicationStatus: "PUBLISHED" | "DRAFT";
  lastVerifiedAt: Date | null;
};
type Prepared = {
  candidate: Candidate;
  decision: Decision;
  source: Source;
  fields: ShopFields;
  categoryIds: string[];
};
export type PlanItem =
  | (Prepared & { action: "insert"; shopId: string; slug: string })
  | (Prepared & { action: "update"; shopId: string; changes: string[] })
  | (Prepared & { action: "unchanged"; shopId: string })
  | { action: "conflict" | "refused" | "skipped"; id: string; reason: string };

const round6 = (n: number | undefined) =>
  n === undefined ? null : Math.round(n * 1e6) / 1e6;
const num = (d: unknown) => (d === null || d === undefined ? null : Number(d));

/** Decide what publication would do. Reads only; never writes. */
export async function planPublication(
  db: PrismaClient,
  input: {
    candidates: Candidate[];
    decisions: Record<string, Decision>;
    sources: Source[];
  },
): Promise<PlanItem[]> {
  const ids = input.candidates.map((c) => ({
    source: c.source,
    sourceRecordId: c.sourceRecordId,
  }));
  const [streets, categories, links, shops] = await Promise.all([
    db.street.findMany({ select: { id: true, slug: true } }),
    db.category.findMany({ select: { id: true, slug: true } }),
    ids.length
      ? db.shopSource.findMany({
          where: { OR: ids },
          include: {
            shop: { include: { categories: { select: { categoryId: true } } } },
          },
        })
      : Promise.resolve([]),
    db.shop.findMany({
      select: { id: true, slug: true, name: true, streetId: true },
      take: 20000,
    }),
  ]);
  const streetId = new Map(streets.map((s) => [s.slug, s.id]));
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));
  const linkFor = new Map(
    links.map((l) => [`${l.source}:${l.sourceRecordId}`, l]),
  );
  const usedSlugs = new Set(shops.map((s) => s.slug));
  const sources = new Map(input.sources.map((s) => [s.id, s]));

  return input.candidates.map((candidate): PlanItem => {
    const id = candidate.id;
    const refuse = (reason: string): PlanItem => ({
      action: "refused",
      id,
      reason,
    });
    const source = sources.get(candidate.source);
    const blocked = publicationBlocker(source);
    if (blocked) return refuse(`source ${candidate.source}: ${blocked}`);
    const decision = input.decisions[id];
    if (!decision) return { action: "skipped", id, reason: "awaiting review" };
    if (decision.decision === "rejected")
      return { action: "skipped", id, reason: "rejected in review" };
    if (candidate.flags.includes("out_of_area"))
      return refuse("outside the Pettah study area");
    if (
      candidate.flags.includes("possible_duplicate") &&
      decision.duplicateResolution !== "distinct"
    )
      return refuse("unresolved duplicate suggestion");
    const streetSlug = decision.streetSlug ?? candidate.streetSlug;
    if (!streetSlug) return refuse("no street association; set one in review");
    const sid = streetId.get(streetSlug);
    if (!sid) return refuse(`street ${streetSlug} does not exist`);
    if (candidate.flags.includes("category_unknown") && !decision.categories)
      return refuse("unmapped category; set categories in review");
    const slugs = decision.categories ?? candidate.categories;
    const missing = slugs.filter((s) => !categoryId.has(s));
    if (missing.length)
      return refuse(`unknown categories: ${missing.join(", ")}`);

    const verified = decision.independentlyVerified;
    // Only a mapped point is stored as coordinates; representative centres would overstate precision.
    const exact = candidate.locationPrecision === "exact";
    const fields: ShopFields = {
      name: candidate.name,
      streetId: sid,
      latitude: exact ? round6(candidate.latitude) : null,
      longitude: exact ? round6(candidate.longitude) : null,
      contactPhone: candidate.contactPhone ?? null,
      verificationStatus: verified ? "VERIFIED" : "UNVERIFIED",
      publicationStatus: verified ? "PUBLISHED" : "DRAFT",
      lastVerifiedAt: verified ? new Date(decision.reviewedAt) : null,
    };
    const prepared = {
      candidate,
      decision,
      source: source!,
      fields,
      categoryIds: slugs.map((s) => categoryId.get(s)!).sort(),
    };

    const link = linkFor.get(id);
    if (link) {
      const shop = link.shop;
      const before: Record<string, unknown> = {
        ...shop,
        latitude: num(shop.latitude),
        longitude: num(shop.longitude),
      };
      const changes: string[] = (
        Object.keys(fields) as (keyof ShopFields)[]
      ).filter((k) => {
        const next = fields[k];
        if (next === null) return false; // missing new data never erases existing details
        return (
          String(next instanceof Date ? next.toISOString() : next) !==
          String(
            before[k] instanceof Date
              ? (before[k] as Date).toISOString()
              : before[k],
          )
        );
      });
      const oldCats = shop.categories.map((c) => c.categoryId).sort();
      if (oldCats.join() !== prepared.categoryIds.join())
        changes.push("categories");
      if (!changes.length)
        return { ...prepared, action: "unchanged", shopId: shop.id };
      if (shop.verificationStatus === "VERIFIED")
        return {
          action: "conflict",
          id,
          reason: `verified shop ${shop.slug} differs (${changes.join(", ")}); edit it manually`,
        };
      return { ...prepared, action: "update", shopId: shop.id, changes };
    }

    const key = comparisonKey(candidate.name);
    const clash = shops.find(
      (s) => s.streetId === sid && comparisonKey(s.name) === key,
    );
    if (clash && decision.duplicateResolution !== "distinct")
      return {
        action: "conflict",
        id,
        reason: `possible duplicate of existing shop ${clash.slug}`,
      };
    const base =
      slugify(candidate.name).slice(0, 60).replace(/-+$/, "") || "shop";
    const slug = !usedSlugs.has(base)
      ? base
      : `${base}-${slugify(`${candidate.source}-${candidate.sourceRecordId}`)}`
          .slice(0, 80)
          .replace(/-+$/, "");
    if (usedSlugs.has(slug)) return refuse(`slug ${slug} already in use`);
    usedSlugs.add(slug);
    return {
      ...prepared,
      action: "insert",
      shopId: `shop_${randomUUID()}`,
      slug,
    };
  });
}

export function summarize(plan: PlanItem[]) {
  const counts: Record<string, number> = {};
  for (const item of plan) counts[item.action] = (counts[item.action] ?? 0) + 1;
  return counts;
}

export type Backup = {
  createdAt: string;
  status: "pending" | "applied";
  inserted: string[];
  updated: {
    shopId: string;
    before: Record<string, unknown>;
    categoryIds: string[];
  }[];
};

/** Capture what an apply would overwrite, so it can be restored. */
export async function backupFor(
  db: PrismaClient,
  plan: PlanItem[],
  now: Date,
): Promise<Backup> {
  const updates = plan.filter((p) => p.action === "update");
  const before = await db.shop.findMany({
    where: { id: { in: updates.map((u) => u.shopId) } },
    include: { categories: { select: { categoryId: true } } },
  });
  return {
    createdAt: now.toISOString(),
    status: "pending",
    inserted: plan.flatMap((p) => (p.action === "insert" ? [p.shopId] : [])),
    updated: before.map(({ categories, ...shop }) => ({
      shopId: shop.id,
      before: {
        name: shop.name,
        streetId: shop.streetId,
        latitude: num(shop.latitude),
        longitude: num(shop.longitude),
        contactPhone: shop.contactPhone,
        verificationStatus: shop.verificationStatus,
        publicationStatus: shop.publicationStatus,
        lastVerifiedAt: shop.lastVerifiedAt?.toISOString() ?? null,
      },
      categoryIds: categories.map((c) => c.categoryId),
    })),
  };
}

/** Apply inserts/updates in one transaction: all or nothing. */
export async function applyPlan(db: PrismaClient, plan: PlanItem[], now: Date) {
  const writes = plan.filter(
    (p) =>
      p.action === "insert" ||
      p.action === "update" ||
      p.action === "unchanged",
  );
  if (
    writes.filter((w) => w.action !== "unchanged").length > MAX_CHANGES_PER_RUN
  )
    throw new Error(
      `More than ${MAX_CHANGES_PER_RUN} changes; split the review into smaller batches`,
    );
  await db.$transaction(
    async (tx) => {
      for (const item of writes) {
        if (
          item.action === "insert" ||
          item.action === "update" ||
          item.action === "unchanged"
        ) {
          const { candidate, decision, source, categoryIds } = item;
          const entry = {
            at: now.toISOString(),
            action: item.action,
            changes: item.action === "update" ? item.changes : undefined,
            reviewer: decision.reviewer,
            reviewedAt: decision.reviewedAt,
            notes: decision.notes,
            datasetVersion: candidate.provenance.sourceDatasetVersion,
          };
          const sourceData = {
            sourceUrl: candidate.sourceUrl,
            license: source.license,
            attribution: source.attribution,
            attributionUrl: source.attributionUrl,
            datasetVersion: candidate.provenance.sourceDatasetVersion,
            locationPrecision: candidate.locationPrecision,
            verificationEvidence: decision.evidence,
            rawTags: candidate.rawTags,
            lastCheckedAt: now,
          };
          const key = {
            source: candidate.source,
            sourceRecordId: candidate.sourceRecordId,
          };
          if (item.action === "insert") {
            await tx.shop.create({
              data: {
                id: item.shopId,
                slug: item.slug,
                ...item.fields,
                categories: {
                  create: categoryIds.map((categoryId) => ({ categoryId })),
                },
                sources: {
                  create: { ...key, ...sourceData, history: [entry] },
                },
              },
            });
            continue;
          }
          const link = await tx.shopSource.findUniqueOrThrow({
            where: { source_sourceRecordId: key },
          });
          const history = [
            ...((link.history as Prisma.JsonArray) ?? []),
            entry,
          ] as Prisma.InputJsonArray;
          await tx.shopSource.update({
            where: { id: link.id },
            data: { ...sourceData, history },
          });
          if (item.action === "update") {
            const data = Object.fromEntries(
              Object.entries(item.fields).filter(([, v]) => v !== null),
            );
            await tx.shop.update({ where: { id: item.shopId }, data });
            if (item.changes.includes("categories")) {
              await tx.shopCategory.deleteMany({
                where: { shopId: item.shopId },
              });
              await tx.shopCategory.createMany({
                data: categoryIds.map((categoryId) => ({
                  shopId: item.shopId,
                  categoryId,
                })),
              });
            }
          }
        }
      }
    },
    { timeout: 60_000 },
  );
}

/** Undo an applied run: restore overwritten shops and withdraw (never delete) inserted ones. */
export async function rollback(db: PrismaClient, backup: Backup) {
  await db.$transaction(async (tx) => {
    await tx.shop.updateMany({
      where: { id: { in: backup.inserted } },
      data: { publicationStatus: "DRAFT" },
    });
    for (const { shopId, before, categoryIds } of backup.updated) {
      await tx.shop.update({
        where: { id: shopId },
        data: {
          ...(before as Omit<ShopFields, "lastVerifiedAt">),
          lastVerifiedAt: before.lastVerifiedAt
            ? new Date(before.lastVerifiedAt as string)
            : null,
        },
      });
      await tx.shopCategory.deleteMany({ where: { shopId } });
      await tx.shopCategory.createMany({
        data: categoryIds.map((categoryId) => ({ shopId, categoryId })),
      });
    }
  });
}

/** Real writes need --apply, a non-CI shell, and explicit host confirmation for any non-local database. */
export function publishBlocker(
  env: Record<string, string | undefined>,
  args: { apply: boolean; confirmHost?: string },
) {
  if (!args.apply) return null; // dry-run never writes
  if (env.CI) return "Refusing to publish from CI; run manually.";
  if (!env.DATABASE_URL) return "DATABASE_URL is not set.";
  const host = new URL(env.DATABASE_URL).hostname;
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(host);
  if (local && env.NODE_ENV !== "production") return null;
  if (env.DATA_PUBLISH_ALLOW_REMOTE !== "yes")
    return "Non-local/production database: set DATA_PUBLISH_ALLOW_REMOTE=yes and pass --confirm-host <hostname>.";
  if (args.confirmHost !== host)
    return `--confirm-host must equal the database host (${host}).`;
  return null;
}
