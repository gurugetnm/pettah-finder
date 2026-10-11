import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
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
const icons: Record<string, LucideIcon> = {
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
}: {
  category: Pick<Category, "name" | "slug" | "description" | "iconKey">;
}) {
  const Icon = icons[category.iconKey] ?? ShoppingBag;
  return (
    <Link className="category-card" href={`/streets?category=${category.slug}`}>
      <span className="icon-box">
        <Icon size={25} strokeWidth={1.6} />
      </span>
      <span>
        <h3>{category.name}</h3>
        <p>{category.description}</p>
      </span>
      <ArrowUpRight className="card-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
export function StreetCard({
  street,
  index = 0,
}: {
  street: StreetSummary;
  index?: number;
}) {
  return (
    <article className="street-card">
      <Link href={`/streets/${street.slug}`} className="street-card-link">
        <div className={`street-banner banner-${index % 3}`}>
          <span className="street-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <MapPin size={27} strokeWidth={1.5} />
          <span className="street-banner-label">PETTAH / COLOMBO</span>
          <ArrowUpRight size={22} />
        </div>
        <div className="street-body">
          <h3>{street.name}</h3>
          <p>{street.description}</p>
          <div className="tags">
            {street.categories.map(({ category }) => (
              <span key={category.id}>{category.name}</span>
            ))}
          </div>
          <div className="street-cta">
            Explore this street <ArrowUpRight size={16} />
          </div>
        </div>
      </Link>
    </article>
  );
}
export function StreetGrid({ streets }: { streets: StreetSummary[] }) {
  return (
    <div className="street-grid">
      {streets.map((street, i) => (
        <StreetCard street={street} index={i} key={street.id} />
      ))}
    </div>
  );
}
