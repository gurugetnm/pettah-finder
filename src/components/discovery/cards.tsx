import { StreetVisual } from "./street-visual";
import Link from "next/link";
import { DirectionsLink } from "./directions-link";
import {
  ArrowUpRight,
  MapPin,
  ArrowRight,
  Cpu,
  Smartphone,
  Scissors,
  Shirt,
  Gem,
  Pencil,
  Lamp,
  ToyBrick,
  House,
  Leaf,
  ShoppingBag,
  Footprints,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/generated/prisma/client";
import type { StreetSummary } from "@/features/discovery/repository";
export const icons: Record<string, LucideIcon> = {
  cpu: Cpu,
  smartphone: Smartphone,
  scissors: Scissors,
  shirt: Shirt,
  gem: Gem,
  pencil: Pencil,
  lamp: Lamp,
  toy: ToyBrick,
  house: House,
  leaf: Leaf,
  bag: ShoppingBag,
  footprints: Footprints,
};
export function CategoryCard({
  category,
  headingLevel = 3,
}: {
  headingLevel?: 2 | 3;
  category: Pick<Category, "name" | "slug" | "description" | "iconKey">;
}) {
  const Icon = icons[category.iconKey] ?? ShoppingBag;
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <Link className="category-card" href={`/streets?category=${category.slug}`}>
      <span className="icon-box">
        <Icon size={25} strokeWidth={1.6} />
      </span>
      <span>
        <Heading>{category.name}</Heading>
        <p>{category.description}</p>
      </span>
      <ArrowUpRight className="card-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
export function StreetCard({
  street,
  headingLevel = 3,
}: {
  street: StreetSummary;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="street-card">
      <Link
        href={`/streets/${street.slug}`}
        className="street-card-link"
        aria-label={`Explore ${street.name}`}
      >
        <StreetVisual slug={street.slug} name={street.name} />
        <div className="street-card-body">
          <div className="street-meta">
            <span>
              <MapPin size={14} /> Pettah, Colombo
            </span>
            <ArrowUpRight size={18} />
          </div>
          <Heading>{street.name}</Heading>
          <p>{street.description}</p>
          <div className="tags">
            {street.categories.map(({ category }) => (
              <span key={category.id}>{category.name}</span>
            ))}
          </div>
          <span className="street-cta">
            Explore street <ArrowRight size={16} />
          </span>
        </div>
      </Link>
      <div className="street-directions">
        <DirectionsLink destination={street.name} compact />
      </div>
    </article>
  );
}
export function StreetGrid({
  streets,
  headingLevel = 3,
}: {
  streets: StreetSummary[];
  headingLevel?: 2 | 3;
}) {
  return (
    <div className="street-grid">
      {streets.map((street) => (
        <StreetCard
          street={street}
          key={street.id}
          headingLevel={headingLevel}
        />
      ))}
    </div>
  );
}
