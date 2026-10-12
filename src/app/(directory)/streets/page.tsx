import Link from "next/link";
import { Info, MapPin } from "lucide-react";
import { discovery } from "@/features/discovery/repository";
import { StreetGrid } from "@/components/discovery/cards";
import { slugSchema } from "@/lib/validations/search";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Shopping streets",
  "Explore the shopping streets of Pettah, Colombo, with preliminary category guides.",
  "/streets",
);
export default async function Streets({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  const rawCategory = (await searchParams).category;
  const parsed = slugSchema.optional().safeParse(rawCategory);
  if (!parsed.success)
    return (
      <div className="shell error-panel">
        <h1>That filter isn’t valid.</h1>
        <p>Choose a category from the directory.</p>
        <Link className="text-link" href="/streets">
          View all streets
        </Link>
      </div>
    );
  const [categories, streets] = await Promise.all([
    discovery().categories(),
    discovery().streets(parsed.data),
  ]);
  return (
    <div className="shell content-page">
      <div className="page-heading">
        <span className="eyebrow">GET TO KNOW THE NEIGHBOURHOOD</span>
        <h1>Every street has a story.</h1>
        <p>
          Explore Pettah’s shopping streets and find a starting point for your
          next visit.
        </p>
      </div>
      <nav className="filter-list" aria-label="Filter streets by category">
        <Link href="/streets" aria-current={!parsed.data ? "page" : undefined}>
          All streets
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/streets?category=${c.slug}`}
            aria-current={parsed.data === c.slug ? "page" : undefined}
          >
            {c.name}
          </Link>
        ))}
      </nav>
      <Link
        className="text-link"
        href={parsed.data ? `/?category=${parsed.data}` : "/"}
      >
        <MapPin size={17} /> View on the map
      </Link>
      <StreetGrid streets={streets} headingLevel={2} />
      {!streets.length && (
        <div className="empty-state">
          <h2>No streets in this category yet.</h2>
          <p>
            Our guide is growing. Try another category or explore all streets.
          </p>
          <Link className="text-link" href="/streets">
            View all streets
          </Link>
        </div>
      )}
      <p className="accuracy-note">
        <Info size={16} /> Product associations are preliminary. Streets may
        sell many other products; check availability locally.
      </p>
    </div>
  );
}
