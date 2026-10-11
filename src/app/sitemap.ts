import type { MetadataRoute } from "next";
import { discovery } from "@/features/discovery/repository";
import { shops } from "@/features/discovery/shops";
import { siteUrl } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [streets, publicShops] = await Promise.all([
    discovery().streets(),
    shops().list(),
  ]);
  return [
    ...["/", "/categories", "/streets", "/shops"].map((path) => ({
      url: new URL(path, siteUrl).href,
    })),
    ...publicShops.map((shop) => ({
      url: new URL(`/shops/${shop.slug}`, siteUrl).href,
      lastModified: shop.updatedAt,
    })),
    ...streets.map((street) => ({
      url: new URL(`/streets/${street.slug}`, siteUrl).href,
      lastModified: street.updatedAt,
    })),
  ];
}
