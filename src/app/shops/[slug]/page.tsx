import Link from "next/link";
import { ShopContact } from "@/components/discovery/shop-contact";
import { notFound } from "next/navigation";
import { cache } from "react";
import { shops } from "@/features/discovery/shops";
import { DirectionsLink } from "@/components/discovery/directions-link";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
const getShop = cache((slug: string) => shops().detail(slug));
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const shop = await getShop((await params).slug);
  return shop
    ? pageMetadata(
        shop.name,
        shop.description ??
          `Explore ${shop.name} on ${shop.street.name} in Pettah.`,
        `/shops/${shop.slug}`,
      )
    : { title: "Shop not found", robots: { index: false } };
}
export default async function ShopDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const shop = await getShop((await params).slug);
  if (!shop) notFound();
  return (
    <div className="shell content-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shops">Shops</Link>
        <span>/</span>
        <span aria-current="page">{shop.name}</span>
      </nav>
      <div className="page-heading">
        <span className="eyebrow">PETTAH SHOP DIRECTORY</span>
        <h1>{shop.name}</h1>
        <p>
          {shop.description ??
            "No description has been provided for this business."}
        </p>
      </div>
      <div className="detail-grid">
        <div>
          <section className="detail-panel">
            <h2>Shopping categories</h2>
            <div className="tags">
              {shop.categories.map(({ category }) => (
                <Link
                  key={category.id}
                  href={`/shops?category=${category.slug}`}
                >
                  {category.name}
                </Link>
              ))}
            </div>
            {!shop.categories.length && <p>No categories recorded yet.</p>}
          </section>
          <section className="detail-panel">
            <h2>Products</h2>
            <ul className="product-list">
              {shop.products.map(({ product }) => (
                <li key={product.id}>
                  <Link href={`/shops?q=${encodeURIComponent(product.name)}`}>
                    {product.name}
                  </Link>
                </li>
              ))}
            </ul>
            {!shop.products.length && <p>No product list recorded yet.</p>}
            <p className="mt-4">
              Confirm product availability and prices directly with the shop.
            </p>
          </section>
          <section className="detail-panel">
            <h2>Shopping options</h2>
            <p>
              Retail:{" "}
              {shop.retailAvailable === null
                ? "Not confirmed"
                : shop.retailAvailable
                  ? "Available"
                  : "Not offered"}
            </p>
            <p>
              Wholesale:{" "}
              {shop.wholesaleAvailable === null
                ? "Not confirmed"
                : shop.wholesaleAvailable
                  ? "Available"
                  : "Not offered"}
            </p>
            {shop.lastVerifiedAt && (
              <p className="mt-4">
                Listing last checked:{" "}
                {shop.lastVerifiedAt.toLocaleDateString("en-GB", {
                  timeZone: "Asia/Colombo",
                })}
              </p>
            )}
          </section>
        </div>
        <aside className="detail-panel location-panel">
          <h2>Visit this shop</h2>
          <ShopContact phone={shop.contactPhone} />
          <Link className="text-link" href={`/streets/${shop.street.slug}`}>
            {shop.street.name}
          </Link>
          <p className="mt-3">
            Google Maps resolves the business and street name. Confirm the
            destination before travelling.
          </p>
          <DirectionsLink destination={`${shop.name}, ${shop.street.name}`} />
        </aside>
      </div>
    </div>
  );
}
