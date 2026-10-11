import Link from "next/link";
import { ArrowUpRight, Store } from "lucide-react";
import type { PublicShop } from "@/features/discovery/shops";
export function ShopCard({ shop }: { shop: PublicShop }) {
  return (
    <article className="detail-panel">
      <Store className="text-primary mb-4" />
      <Link href={`/shops/${shop.slug}`} className="text-link">
        <h2>{shop.name}</h2>
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
