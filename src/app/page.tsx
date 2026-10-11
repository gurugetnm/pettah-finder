import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  Compass,
  ShoppingBag,
  Info,
} from "lucide-react";
import { discovery } from "@/features/discovery/repository";
import { CategoryCard, StreetGrid } from "@/components/discovery/cards";
import { MarketIllustration } from "@/components/discovery/market-illustration";
import { SearchForm } from "@/components/search/search-form";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Home() {
  const [categories, streets] = await Promise.all([
    discovery().categories(),
    discovery().streets(),
  ]);
  return (
    <>
      <div className="shell">
        <section className="hero">
          <div className="hero-copy">
            <span className="location-pill">
              <MapPin size={13} /> PETTAH, COLOMBO
            </span>
            <h1>
              Find what you
              <br />
              need in <span>Pettah.</span>
            </h1>
            <p>
              Discover shopping streets, explore product categories, and find
              your way around Colombo&apos;s busiest marketplace.
            </p>
            <SearchForm />
            <div className="suggestions">
              <span>Popular searches</span>
              {[
                "Phone accessories",
                "Fabrics",
                "Jewellery",
                "Stationery",
                "Lighting",
              ].map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q === "Phone accessories" ? "mobile accessories" : q)}`}
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
          <MarketIllustration />
        </section>
        <div className="discovery-strip">
          <div>
            <Compass size={17} /> A little local knowledge goes a long way
          </div>
          <div>
            <MapPin size={17} /> Explore street by street
          </div>
          <div>
            <ShoppingBag size={17} /> Find your shopping starting point
          </div>
        </div>
        <section className="section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">START WITH WHAT YOU NEED</span>
              <h2>Explore by category</h2>
              <p>From everyday essentials to your next great find.</p>
            </div>
            <Link href="/categories" className="text-link">
              All categories <ArrowUpRight size={17} />
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
      </div>
      <section className="section streets-section">
        <div className="shell">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GET TO KNOW THE NEIGHBOURHOOD</span>
              <h2>Popular shopping streets</h2>
              <p>A few familiar names to start your Pettah adventure.</p>
            </div>
            <Link href="/streets" className="text-link">
              Explore all streets <ArrowUpRight size={17} />
            </Link>
          </div>
          <StreetGrid streets={streets.slice(0, 3)} />
          {!streets.length && <p>Street listings are coming soon.</p>}
          <p className="accuracy-note">
            <Info size={16} /> Street categories are preliminary guides, not
            guarantees of availability.
          </p>
        </div>
      </section>
      <section className="shell section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">LESS GUESSWORK. MORE DISCOVERY.</span>
            <h2>Your next find, in three steps</h2>
          </div>
        </div>
        <div className="how-grid">
          {[
            [
              "Search for a product",
              "Tell us what you’re looking for, from phone chargers to fabrics.",
            ],
            [
              "Find a relevant street",
              "Discover streets associated with your shopping category.",
            ],
            [
              "Explore your options",
              "Get to know the area and confirm availability when you visit.",
            ],
          ].map(([title, text], i) => (
            <div className="how-step" key={title}>
              <span className="how-number">0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="shell">
        <div className="cta-panel">
          <div>
            <h2>A busy marketplace. A clearer starting point.</h2>
            <p>Take a look around before you head out.</p>
          </div>
          <Button asChild>
            <Link href="/streets">
              Discover the streets <ArrowRight size={17} />
            </Link>
          </Button>
        </div>
      </div>
    </>
  );
}
