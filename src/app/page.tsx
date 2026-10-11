import { Suspense } from "react";
import LoadingFeedback from "@/components/layout/loading-feedback";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Info,
  Search,
  Route,
  ShoppingBag,
} from "lucide-react";
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
          <span className="location-pill">
            <MapPin size={14} /> Your local guide to Pettah, Colombo
          </span>
          <h1 id="hero-title">
            Find what you need
            <br />
            in <span>Pettah.</span>
          </h1>
          <p>
            The right streets. The right discoveries.
            <br className="desktop-break" /> A simpler way to explore Colombo’s
            busiest marketplace.
          </p>
          <SearchForm />
          <div className="suggestions">
            <span>Try searching</span>
            {[
              ["Phone accessories", "mobile accessories"],
              ["Fabrics", "fabrics"],
              ["Jewellery", "jewellery"],
              ["Stationery", "stationery"],
            ].map(([label, q]) => (
              <Link href={`/search?q=${encodeURIComponent(q)}`} key={q}>
                {label}
                <ArrowRight size={12} />
              </Link>
            ))}
          </div>
        </section>
        <section
          className="section category-section"
          aria-labelledby="categories-title"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">WHAT’S ON YOUR LIST?</span>
              <h2 id="categories-title">A little of everything.</h2>
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
              <span className="eyebrow">KNOW WHERE TO GO</span>
              <h2 id="streets-title">Start with a street.</h2>
              <p>
                Different streets, different finds. Get to know the
                neighbourhood.
              </p>
            </div>
            <Link href="/streets" className="text-link">
              Explore all streets <ArrowRight size={16} />
            </Link>
          </div>
          <StreetGrid streets={streets.slice(0, 3)} />
          {!streets.length && <p>Street listings are coming soon.</p>}
          <p className="accuracy-note">
            <Info size={15} /> A starting point for exploring. Category
            associations are preliminary; confirm availability locally.
          </p>
        </section>
        <section className="section how-section" aria-labelledby="how-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                A LITTLE DIRECTION GOES A LONG WAY
              </span>
              <h2 id="how-title">Find it. Explore it.</h2>
            </div>
            <p className="how-intro">Less wandering. More finding.</p>
          </div>
          <div className="how-grid">
            {[
              {
                Icon: Search,
                title: "Search for a product",
                text: "From a phone charger to the perfect fabric. Start with what you need.",
              },
              {
                Icon: Route,
                title: "Find the right street",
                text: "See which streets are associated with your shopping category.",
              },
              {
                Icon: ShoppingBag,
                title: "Explore your options",
                text: "Get directions, discover shops and confirm the details when you visit.",
              },
            ].map(({ Icon, title, text }, index) => (
              <div className="how-step" key={title}>
                <span className="how-number">
                  <Icon size={21} strokeWidth={1.6} />
                </span>
                <div>
                  <span className="step-label">0{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
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
