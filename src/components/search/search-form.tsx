import Form from "next/form";
import { Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SearchForm({
  defaultValue = "",
  id = "product-search",
  action = "/search",
}: {
  defaultValue?: string;
  id?: string;
  action?: string;
}) {
  return (
    <Form action={action} role="search" className="search-form">
      <label htmlFor={id} className="sr-only">
        What are you shopping for?
      </label>
      <Search size={22} aria-hidden="true" />
      <input
        id={id}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Search products, shops or streets..."
        maxLength={80}
        autoComplete="off"
      />
      <Button type="submit" aria-label="Search Pettah">
        <span>Find it</span>
        <ArrowRight size={18} />
      </Button>
    </Form>
  );
}
export function EmptySearch({ query }: { query?: string }) {
  return (
    <div className="empty-state">
      <span className="icon-box">
        <Search />
      </span>
      <h2>
        {query ? "No streets found just yet" : "Your next find starts here"}
      </h2>
      <p>
        {query
          ? "Try a broader product name, a category like ‘electronics’, or a street name. Our guide is still growing."
          : "Search for a product, category or street. Try ‘charger’, ‘fabrics’ or ‘Sea Street’."}
      </p>
    </div>
  );
}
