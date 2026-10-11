import type { MetadataRoute } from "next";
import { discovery } from "@/features/discovery/repository";
import { siteUrl } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const streets = await discovery().streets();
  return [
    ...["/", "/categories", "/streets"].map((path) => ({
      url: new URL(path, siteUrl).href,
    })),
    ...streets.map((street) => ({
      url: new URL(`/streets/${street.slug}`, siteUrl).href,
      lastModified: street.updatedAt,
    })),
  ];
}
