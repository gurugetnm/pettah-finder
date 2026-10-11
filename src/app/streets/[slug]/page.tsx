import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Info } from "lucide-react";
import { cache } from "react";
import { discovery } from "@/features/discovery/repository";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
const getStreet = cache((slug: string) => discovery().street(slug));
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const street = await getStreet(slug);
  if (!street) return { title: "Street not found", robots: { index: false } };
  return pageMetadata(
    street.name,
    street.description,
    `/streets/${street.slug}`,
  );
}
export default async function StreetDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const street = await getStreet(slug);
  if (!street) notFound();
  const products = await discovery().products(
    street.categories.map((c) => c.categoryId),
  );
  return (
    <div className="shell content-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/streets">Streets</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{street.name}</span>
      </nav>
      <div className="page-heading">
        <span className="eyebrow">PETTAH, COLOMBO</span>
        <h1>{street.name}</h1>
        <p>{street.description}</p>
      </div>
      <div className="detail-grid">
        <div>
          <section className="detail-panel">
            <h2>What you might find</h2>
            <p>Explore these categories associated with this street.</p>
            <div className="tags">
              {street.categories.map(({ category }) => (
                <Link
                  key={category.id}
                  href={`/streets?category=${category.slug}`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
            <p className="accuracy-note">
              <Info size={16} /> Preliminary associations. This is not an
              exclusive list or a guarantee of stock.
            </p>
          </section>
          <section className="detail-panel">
            <h2>Products to explore</h2>
            <ul className="product-list">
              {products.map((p) => (
                <li key={p.id}>
                  <Link href={`/search?q=${encodeURIComponent(p.name)}`}>
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
            {!products.length && (
              <p>No related products have been added yet.</p>
            )}
          </section>
          <section className="detail-panel">
            <h2>Shops on this street</h2>
            {street.shops.length ? (
              <ul>
                {street.shops.map((shop) => (
                  <li key={shop.id}>
                    <h3>{shop.name}</h3>
                    <p>{shop.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p>We’re building a verified shop directory.</p>
                <p className="mt-3">
                  No individual businesses have been listed yet. For now, use
                  the street and category guide to plan your exploration.
                </p>
              </>
            )}
          </section>
        </div>
        <aside>
          <section className="detail-panel location-panel">
            <MapPin size={28} />
            <h2>Finding your way</h2>
            <p>{street.locationDescription}</p>
            <p className="mt-4">
              A precise map pin will appear once the location has been verified.
              Check local signs and ask for directions when you arrive.
            </p>
          </section>
          <section className="detail-panel">
            <span className="eyebrow">BEFORE YOU GO</span>
            <p className="mt-3">
              Product ranges and availability can change. Confirm prices and
              details with a shop before making a purchase.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
