import { discovery } from "@/features/discovery/repository";
import { CategoryCard } from "@/components/discovery/cards";
import { pageMetadata } from "@/lib/utils/site";
export const dynamic = "force-dynamic";
export const metadata = pageMetadata(
  "Shopping categories",
  "Explore electronics, textiles, jewellery and more in Pettah, Colombo.",
  "/categories",
);
export default async function Categories() {
  const categories = await discovery().categories();
  return (
    <div className="shell content-page">
      <div className="page-heading">
        <span className="eyebrow">START WITH WHAT YOU NEED</span>
        <h1>What’s on your shopping list?</h1>
        <p>
          Choose a category to discover relevant streets. These preliminary
          associations are a starting point for exploring Pettah.
        </p>
      </div>
      <div className="category-grid">
        {categories.map((category) => (
          <CategoryCard
            category={category}
            key={category.id}
            headingLevel={2}
          />
        ))}
      </div>
      {!categories.length && <p>No categories have been added yet.</p>}
    </div>
  );
}
