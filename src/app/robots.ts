import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/utils/site";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/search"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
