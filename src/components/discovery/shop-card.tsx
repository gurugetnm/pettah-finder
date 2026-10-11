import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
import type { PublicShop } from "@/features/discovery/shops";
export function ShopCard({
  shop,
  headingLevel = 2,
}: {
  shop: PublicShop;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="detail-panel shop-card">
      <Store className="text-primary mb-4" />
      <Link href={`/shops/${shop.slug}`} className="shop-title">
        <Heading>{shop.name}</Heading>
        <ArrowUpRight size={18} />
      </Link>
      <p>{shop.street.name}</p>
      {shop.description && <p className="mt-3">{shop.description}</p>}
      <div className="tags">
        {shop.categories.map(({ category }) => (
          <Link href={`/shops?category=${category.slug}`} key={category.id}>
            {category.name}
          </Link>
        ))}
      </div>
    </article>
  );
}
