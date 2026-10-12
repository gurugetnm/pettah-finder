import { Suspense } from "react";
import { getTileConfiguration } from "@/lib/maps/tile-provider";
import { DiscoveryApp } from "@/components/discovery/discovery-app";
import { shopMapData, streetMapData } from "@/lib/utils/street-map-data";
import { discovery } from "@/features/discovery/repository";
import { shops } from "@/features/discovery/shops";
import { parseQuery } from "@/lib/validations/search";
export const dynamic = "force-dynamic";
type Params = Promise<{ q?: string | string[] }>;
async function MapHome({ searchParams }: { searchParams: Params }) {
  const parsed = parseQuery((await searchParams).q);
  const query = parsed.success ? parsed.data : "";
  // Category, street and shop selection are applied client-side from the URL; only the text query needs the database.
  const [streets, results, shopList] = await Promise.all([
    discovery().streets(),
    query ? discovery().search(query) : null,
    shops().list({ q: query }),
  ]);
  const extra =
    results?.streets.filter((s) => !streets.some((t) => t.slug === s.slug)) ??
    [];
  return (
    <DiscoveryApp
      streets={streetMapData([...streets, ...extra])}
      shops={shopMapData(shopList)}
      query={query}
      invalidQuery={!parsed.success}
      matchedStreets={results ? results.streets.map((s) => s.slug) : null}
      matchedCategories={results?.categories.map(({ name, slug }) => ({
        name,
        slug,
      }))}
      tiles={getTileConfiguration()}
    />
  );
}
export default function Home(props: { searchParams: Params }) {
  return (
    <Suspense
      fallback={
        <div className="map-app map-app-loading" role="status">
          Loading the Pettah map…
        </div>
      }
    >
      <MapHome {...props} />
    </Suspense>
  );
}
