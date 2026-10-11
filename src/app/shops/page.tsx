import Link from "next/link";
import { Store } from "lucide-react";
import { shops } from "@/features/discovery/shops";
import { discovery } from "@/features/discovery/repository";
import { shopFilterSchema } from "@/lib/validations/filters";
import { ShopCard } from "@/components/discovery/shop-card";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Shop directory",
  "Find verified shops in Pettah by product, category and street.",
  "/shops",
);
export default async function ShopDirectory({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = shopFilterSchema.safeParse(await searchParams);
  if (!params.success)
    return (
      <div className="shell error-panel">
        <h1>Check your shop filters.</h1>
        <p>
          Use a single product query of up to 80 characters and select a
          category or street.
        </p>
        <Link href="/shops" className="text-link">
          Clear filters
        </Link>
      </div>
    );
  const [list, categories, streets] = await Promise.all([
    shops().list(params.data),
    discovery().categories(),
    discovery().streets(),
  ]);
  return (
    <div className="shell content-page">
      <div className="page-heading">
        <span className="eyebrow">DISCOVER LOCAL BUSINESSES</span>
        <h1>Find your next shopping stop.</h1>
        <p>
          Browse verified shop listings by product, category and street. Our
          directory is growing, one confirmed listing at a time.
        </p>
      </div>
      <form action="/shops" className="shop-filters">
        <div>
          <label htmlFor="shop-query">Product or shop</label>
          <input
            id="shop-query"
            name="q"
            type="search"
            maxLength={80}
            placeholder="Try ‘charger’"
            defaultValue={params.data.q}
          />
        </div>
        <div>
          <label htmlFor="shop-category">Category</label>
          <select
            id="shop-category"
            name="category"
            defaultValue={params.data.category ?? ""}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="shop-street">Street</label>
          <select
            id="shop-street"
            name="street"
            defaultValue={params.data.street ?? ""}
          >
            <option value="">All streets</option>
            {streets.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">Find shops</Button>
        <Link href="/shops" className="text-link">
          Clear
        </Link>
      </form>
      {list.length ? (
        <div className="street-grid">
          {list.map((shop) => (
            <ShopCard key={shop.id} shop={shop} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="icon-box">
            <Store />
          </span>
          <h2>No verified shops to show yet.</h2>
          <p>
            We only publish confirmed businesses. Explore the street guide while
            we collect real shop information, or try different filters.
          </p>
          <Link href="/streets" className="text-link">
            Explore shopping streets
          </Link>
        </div>
      )}
    </div>
  );
}
