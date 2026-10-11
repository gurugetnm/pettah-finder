import "server-only";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import { querySchema, slugSchema } from "@/lib/validations/search";
const streetInclude = {
  categories: {
    include: { category: true },
    orderBy: { category: { name: "asc" as const } },
  },
} satisfies Prisma.StreetInclude;
export type StreetSummary = Prisma.StreetGetPayload<{
  include: typeof streetInclude;
}>;
export function discoveryRepository(db: PrismaClient) {
  return {
    categories: () =>
      db.category.findMany({
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 50,
      }),
    streets: (category?: string) => {
      if (category) slugSchema.parse(category);
      return db.street.findMany({
        where: category
          ? { categories: { some: { category: { slug: category } } } }
          : undefined,
        include: streetInclude,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 50,
      });
    },
    street: (slug: string) => {
      if (!slugSchema.safeParse(slug).success) return Promise.resolve(null);
      return db.street.findUnique({
        where: { slug },
        include: {
          ...streetInclude,
          shops: {
            where: {
              publicationStatus: "PUBLISHED",
              verificationStatus: "VERIFIED",
            },
            select: { id: true, name: true, description: true },
            orderBy: { name: "asc" },
            take: 30,
          },
        },
      });
    },
    products: (categoryIds: string[]) =>
      db.product.findMany({
        where: { categoryId: { in: categoryIds.slice(0, 50) } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 50,
      }),
    search: async (rawQuery: string) => {
      const q = querySchema.parse(rawQuery);
      if (!q) return { categories: [], streets: [] };
      const contains = { contains: q, mode: "insensitive" as const };
      const matchedCategory: Prisma.CategoryWhereInput = {
        OR: [
          { name: contains },
          {
            products: {
              some: {
                OR: [
                  { name: contains },
                  { aliases: { some: { normalizedAlias: contains } } },
                ],
              },
            },
          },
        ],
      };
      const [categories, streets] = await db.$transaction([
        db.category.findMany({
          where: matchedCategory,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: 24,
        }),
        db.street.findMany({
          where: {
            OR: [
              { name: contains },
              { categories: { some: { category: matchedCategory } } },
            ],
          },
          include: streetInclude,
          orderBy: [{ name: "asc" }, { id: "asc" }],
          take: 30,
        }),
      ]);
      return { categories, streets };
    },
  };
}
export const discovery = () => discoveryRepository(getDb());
