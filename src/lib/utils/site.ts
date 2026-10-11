import { z } from "zod";
const siteSchema = z.url().refine((value) => {
  const u = new URL(value);
  return (
    ["http:", "https:"].includes(u.protocol) &&
    !u.username &&
    !u.password &&
    u.pathname === "/" &&
    !u.search &&
    !u.hash
  );
});
export const siteUrl = new URL(
  siteSchema.parse(process.env.SITE_URL ?? "http://localhost:3000"),
);
export function pageMetadata(title: string, description: string, path: string) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path },
    twitter: { card: "summary" as const, title, description },
  };
}
