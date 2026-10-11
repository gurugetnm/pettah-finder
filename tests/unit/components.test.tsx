import { ShopContact } from "@/components/discovery/shop-contact";
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchForm, EmptySearch } from "@/components/search/search-form";
import { CategoryCard, StreetCard } from "@/components/discovery/cards";
import { Header, ThemeRoot } from "@/components/layout/navigation";
import type { StreetSummary } from "@/features/discovery/repository";
const category = {
  id: "mobile-accessories",
  name: "Mobile Accessories",
  slug: "mobile-accessories",
  description: "Phone essentials.",
  iconKey: "smartphone",
  createdAt: new Date(),
  updatedAt: new Date(),
};
describe("discovery components", () => {
  it("exposes a labelled GET search with input limit", async () => {
    render(<SearchForm />);
    const input = screen.getByRole("searchbox", {
      name: "What are you shopping for?",
    });
    await userEvent.type(input, "charger");
    expect(input).toHaveValue("charger");
    expect(input).toHaveAttribute("maxlength", "80");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/search");
    expect(
      screen.getByRole("button", { name: "Search Pettah" }),
    ).toHaveAttribute("type", "submit");
  });
  it("links a database category to the filtered directory", () => {
    render(<CategoryCard category={category} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/streets?category=mobile-accessories",
    );
    expect(screen.getByRole("heading")).toHaveTextContent("Mobile Accessories");
  });
  it("links streets and displays their real category relations", () => {
    const street: StreetSummary = {
      id: "1st-cross-street",
      name: "1st Cross Street",
      slug: "1st-cross-street",
      description: "Preliminary guide.",
      locationDescription: "Pettah",
      latitude: null,
      longitude: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      categories: [
        { streetId: "1st-cross-street", categoryId: category.id, category },
      ],
    };
    render(<StreetCard street={street} />);
    expect(
      screen.getByRole("link", { name: "Explore 1st Cross Street" }),
    ).toHaveAttribute("href", "/streets/1st-cross-street");
    expect(screen.getByText("Mobile Accessories")).toBeVisible();
  });
  it("makes recorded valid shop contact details callable", () => {
    render(<ShopContact phone="+1 (202) 555-0100" />);
    expect(
      screen.getByRole("link", { name: "Call shop at +1 (202) 555-0100" }),
    ).toHaveAttribute("href", "tel:+12025550100");
  });
  it("shows an honest state when a contact number is unavailable", () => {
    render(<ShopContact phone={null} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("No contact phone recorded.")).toBeVisible();
  });
  it("offers useful no-results guidance", () => {
    render(<EmptySearch query="unknown" />);
    expect(screen.getByRole("heading")).toHaveTextContent("No streets found");
    expect(screen.getByText(/Try a broader product name/)).toBeVisible();
  });
  it("reports the selected colour theme through toggle state", async () => {
    render(
      <ThemeRoot>
        <Header />
      </ThemeRoot>,
    );
    for (const selected of ["light", "dark", "system"]) {
      await userEvent.click(
        screen.getByRole("button", { name: "Change colour theme" }),
      );
      const group = screen.getByRole("group", { name: "Colour theme" });
      await userEvent.click(
        within(group).getByRole("button", { name: `Use ${selected} theme` }),
      );
      for (const theme of ["light", "dark", "system"])
        expect(
          within(group).getByRole("button", {
            name: `Use ${theme} theme`,
            hidden: true,
          }),
        ).toHaveAttribute("aria-pressed", String(theme === selected));
    }
  });
  it("closes mobile navigation with Escape and returns focus", async () => {
    render(
      <ThemeRoot>
        <Header />
      </ThemeRoot>,
    );
    const button = screen.getByRole("button", { name: "Open navigation" });
    await userEvent.click(button);
    within(screen.getByRole("navigation", { name: "Mobile navigation" }))
      .getByRole("link", { name: "Shops" })
      .focus();
    await userEvent.keyboard("{Escape}");
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
  });
  it("opens mobile navigation and closes it after choosing a public route", async () => {
    render(
      <div onClick={(event) => event.preventDefault()}>
        <ThemeRoot>
          <Header />
        </ThemeRoot>
      </div>,
    );
    const open = screen.getByRole("button", { name: "Open navigation" });
    expect(open).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(open);
    const nav = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(nav).toBeInTheDocument();
    await userEvent.click(within(nav).getByRole("link", { name: "Shops" }));
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" }),
    ).not.toBeInTheDocument();
  });
});
