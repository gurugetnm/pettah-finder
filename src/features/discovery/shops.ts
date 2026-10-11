import "server-only";
import { publicShopWhere } from "./public-shop";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getDb } from "@/lib/db/client";
import { shopFilterSchema } from "@/lib/validations/filters";
import { slugSchema } from "@/lib/validations/search";
const include = {
  street: { select: { name: true, slug: true } },
  categories: {
    include: { category: true },
    orderBy: { category: { name: "asc" as const } },
  },
  products: {
    include: { product: true },
    orderBy: { product: { name: "asc" as const } },
  },
} satisfies Prisma.ShopInclude;
export type PublicShop = Prisma.ShopGetPayload<{ include: typeof include }>;
export function shopRepository(db: PrismaClient) {
  return {
    list: (input: unknown = {}) => {
      const { q, category, street } = shopFilterSchema.parse(input);
      const contains = { contains: q, mode: "insensitive" as const };
      const where: Prisma.ShopWhereInput = {
        ...publicShopWhere,
        ...(street ? { street: { slug: street } } : {}),
        ...(category
          ? { categories: { some: { category: { slug: category } } } }
          : {}),
        ...(q
          ? {
              OR: [
                { name: contains },
                { categories: { some: { category: { name: contains } } } },
                {
                  products: {
                    some: {
                      product: {
                        OR: [
                          { name: contains },
                          { aliases: { some: { normalizedAlias: contains } } },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      };
      return db.shop.findMany({
        where,
        include,
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: 50,
      });
    },
    detail: (slug: string) => {
      if (!slugSchema.safeParse(slug).success) return Promise.resolve(null);
      return db.shop.findFirst({
        where: { slug, ...publicShopWhere },
        include,
      });
    },
  };
}
export const shops = () => shopRepository(getDb());
