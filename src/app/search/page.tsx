import { Info } from "lucide-react";
import { parseQuery } from "@/lib/validations/search";
import { discovery } from "@/features/discovery/repository";
import { CategoryCard, StreetGrid } from "@/components/discovery/cards";
import { EmptySearch, SearchForm } from "@/components/search/search-form";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export const metadata = {
  ...pageMetadata(
    "Search Pettah",
    "Find shopping streets by product, category or street name.",
    "/search",
  ),
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const result = parseQuery((await searchParams).q);
  const query = result.success ? result.data : "";
  const data = query
    ? await discovery().search(query)
    : { streets: [], categories: [] };
  return (
    <div className="shell content-page">
      <div className="page-heading">
        <span className="eyebrow">YOUR MARKETPLACE COMPASS</span>
        <h1>{query ? `Finds for “${query}”` : "What are you looking for?"}</h1>
        <p>Search for products, categories or a familiar street name.</p>
      </div>
      <SearchForm defaultValue={query} />
      {!result.success ? (
        <p role="alert" className="detail-panel">
          Please enter a single query of up to 80 printable characters.
        </p>
      ) : !query || (!data.categories.length && !data.streets.length) ? (
        <EmptySearch query={query} />
      ) : (
        <>
          {data.categories.length > 0 && (
            <section>
              <h2 className="results-heading">Matching categories</h2>
              <div className="category-grid">
                {data.categories.map((c) => (
                  <CategoryCard key={c.id} category={c} />
                ))}
              </div>
            </section>
          )}
          {data.streets.length > 0 && (
            <section>
              <h2 className="results-heading">Streets to explore</h2>
              <StreetGrid streets={data.streets} />
            </section>
          )}
          <p className="accuracy-note">
            <Info size={16} /> Results reflect preliminary category
            associations, not live product availability.
          </p>
        </>
      )}
    </div>
  );
}
