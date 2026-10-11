import "server-only";
import type { Prisma } from "@/generated/prisma/client";
// One publication rule for every public listing, detail page and sitemap.
export const publicShopWhere = {
  publicationStatus: "PUBLISHED",
  verificationStatus: "VERIFIED",
} satisfies Prisma.ShopWhereInput;
