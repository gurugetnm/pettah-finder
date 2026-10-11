import { MarketPhoto } from "@/components/discovery/market-photo";
import { Suspense } from "react";
import LoadingFeedback from "@/components/layout/loading-feedback";
import Link from "next/link";
import { ArrowRight, MapPin, Info, Route } from "lucide-react";
import { discovery } from "@/features/discovery/repository";
import { CategoryCard, StreetGrid } from "@/components/discovery/cards";
import { SearchForm } from "@/components/search/search-form";
export const dynamic = "force-dynamic";
async function HomeContent() {
  const [categories, streets] = await Promise.all([
    discovery().categories(),
    discovery().streets(),
  ]);
  return (
    <>
      <div className="shell">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="location-pill">
              <MapPin size={16} /> Pettah, Colombo · Your shopping compass
            </span>
            <h1 id="hero-title">
              Find what you need
              <br />
              in <span>Pettah.</span>
            </h1>
            <p>
              Discover the streets, shops and products that make Colombo’s
              busiest marketplace worth exploring.
            </p>
            <SearchForm />
            <div className="suggestions">
              <span>Start with</span>
              {[
                ["Phone accessories", "mobile accessories"],
                ["Fabrics", "fabrics"],
                ["Jewellery", "jewellery"],
                ["Stationery", "stationery"],
                ["Lighting", "lighting"],
              ].map(([label, q]) => (
                <Link href={`/search?q=${encodeURIComponent(q)}`} key={q}>
                  {label}
                </Link>
              ))}
            </div>
            <Link className="hero-map-link" href="#explore-map">
              <Route size={18} /> Get to know the neighbourhood{" "}
              <ArrowRight size={16} />
            </Link>
          </div>
          <MarketPhoto hero />
        </section>
        <section
          className="section category-section"
          aria-labelledby="categories-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shop by category</span>
              <h2 id="categories-title">What’s on your shopping list?</h2>
            </div>
            <Link href="/categories" className="text-link">
              All categories <ArrowRight size={16} />
            </Link>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <CategoryCard category={category} key={category.id} />
            ))}
          </div>
          {!categories.length && (
            <p>Categories will appear once the guide is populated.</p>
          )}
        </section>
        <section
          className="section streets-section"
          aria-labelledby="streets-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">The neighbourhood guide</span>
              <h2 id="streets-title">Six streets. Endless discoveries.</h2>
              <p>
                Different streets, different finds. Get to know the
                neighbourhood.
              </p>
            </div>
            <Link href="/streets" className="text-link">
              Explore all streets <ArrowRight size={16} />
            </Link>
          </div>
          <StreetGrid streets={streets.slice(0, 6)} />
          {!streets.length && <p>Street listings are coming soon.</p>}
          <p className="accuracy-note">
            <Info size={15} /> A starting point for exploring. Category
            associations are preliminary; confirm availability locally.
          </p>
        </section>
      </div>
    </>
  );
}
export default function Home() {
  return (
    <Suspense fallback={<LoadingFeedback />}>
      <HomeContent />
    </Suspense>
  );
}
