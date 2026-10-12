import { describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MapShop, MapStreet } from "@/lib/utils/street-map-data";
import type { Selection } from "@/components/discovery/street-map";
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapStub({
      streets,
      shops,
      focus,
      selection,
      onSelect,
    }: {
      streets: MapStreet[];
      shops: MapShop[];
      focus: Set<string> | null;
      selection: Selection;
      onSelect: (s: NonNullable<Selection>) => void;
    }) {
      return (
        <div
          data-testid="interactive-map"
          data-selection={
            selection ? `${selection.kind}:${selection.slug}` : ""
          }
          data-focus={focus ? [...focus].join(",") : "all"}
          data-shops={shops.map((s) => s.slug).join(",")}
        >
          {streets
            .filter((s) => s.point)
            .map((s) => (
              <button
                key={s.slug}
                onClick={() => onSelect({ kind: "street", slug: s.slug })}
              >
                Select marker {s.name}
              </button>
            ))}
          {shops
            .filter((s) => s.point)
            .map((s) => (
              <button
                key={s.slug}
                onClick={() => onSelect({ kind: "shop", slug: s.slug })}
              >
                Select shop marker {s.name}
              </button>
            ))}
        </div>
      );
    },
}));
import { DiscoveryApp } from "@/components/discovery/discovery-app";
const streets: MapStreet[] = [
  {
    slug: "first",
    name: "First street",
    description: "Phone essentials",
    point: [6.938, 79.854],
    categories: [{ slug: "mobile", name: "Mobile" }],
  },
  {
    slug: "sea",
    name: "Sea street",
    description: "Jewellery",
    point: [6.939, 79.854],
    categories: [{ slug: "jewellery", name: "Jewellery" }],
  },
  {
    slug: "pending",
    name: "Pending street",
    description: "Awaiting location",
    point: null,
    categories: [],
  },
];
const shops: MapShop[] = [
  {
    slug: "fixture-phones",
    name: "Fixture Phones",
    street: { slug: "first", name: "First street" },
    categories: [{ slug: "mobile", name: "Mobile" }],
    phone: "+94 11 234 5678",
    point: [6.9381, 79.8541],
  },
  {
    slug: "fixture-unplotted",
    name: "Fixture Unplotted",
    street: { slug: "first", name: "First street" },
    categories: [{ slug: "mobile", name: "Mobile" }],
    phone: null,
    point: null,
  },
];
const tiles = {
  provider: "osm-standard" as const,
  url: "fixture",
  attribution: "fixture",
  maxZoom: 19,
};
const map = () => screen.getByTestId("interactive-map");
const streetList = () =>
  within(
    screen.getByRole("region", { name: /Shopping streets|Streets to explore/ }),
  );
function renderApp(props: Partial<Parameters<typeof DiscoveryApp>[0]> = {}) {
  return render(
    <DiscoveryApp
      streets={streets}
      shops={[]}
      query=""
      matchedStreets={null}
      tiles={tiles}
      {...props}
    />,
  );
}
describe("map-first discovery app", () => {
  it("initializes the map with every street and a search that stays on the map", () => {
    renderApp();
    expect(map()).toHaveAttribute("data-focus", "all");
    expect(
      screen.getAllByRole("button", { name: /Select marker/ }),
    ).toHaveLength(2);
    expect(screen.getByRole("search")).toHaveAttribute("action", "/");
    expect(screen.getByRole("status")).toHaveTextContent(
      "3 streets · 0 verified shops",
    );
    expect(
      screen.getByText(
        "No verified shops have been published yet. Street information is shown instead.",
      ),
    ).toBeVisible();
  });
  it("synchronizes list and marker selection with the URL, details and directions", async () => {
    renderApp();
    await userEvent.click(
      streetList().getByRole("button", { name: /Sea street/ }),
    );
    expect(window.location.search).toBe("?street=sea");
    expect(map()).toHaveAttribute("data-selection", "street:sea");
    expect(
      screen.getByRole("heading", { level: 2, name: "Sea street" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: "Select marker First street" }),
    );
    expect(window.location.search).toBe("?street=first");
    expect(
      streetList().getByRole("button", { name: /First street/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("link", { name: /Google Maps directions to First/ }),
    ).toHaveAttribute("href", expect.stringContaining("destination=First"));
    expect(
      screen.getByRole("link", { name: /Explore Street/ }),
    ).toHaveAttribute("href", "/streets/first");
    await userEvent.click(
      screen.getByRole("button", { name: "Close details" }),
    );
    expect(window.location.search).toBe("");
    expect(map()).toHaveAttribute("data-selection", "");
  });
  it("restores selection on browser back navigation", async () => {
    renderApp();
    await userEvent.click(
      streetList().getByRole("button", { name: /Sea street/ }),
    );
    await userEvent.click(
      streetList().getByRole("button", { name: /First street/ }),
    );
    act(() => window.history.back());
    await waitFor(() =>
      expect(map()).toHaveAttribute("data-selection", "street:sea"),
    );
  });
  it("filters the list and map by category through the URL", async () => {
    window.history.replaceState(null, "", "/?street=first");
    renderApp();
    const filters = screen.getByRole("group", { name: "Filter by category" });
    await userEvent.click(
      within(filters).getByRole("button", { name: "Jewellery" }),
    );
    expect(window.location.search).toBe("?category=jewellery");
    expect(streetList().getAllByRole("button")).toHaveLength(1);
    expect(map()).toHaveAttribute("data-focus", "sea");
    expect(map()).toHaveAttribute("data-selection", "");
    await userEvent.click(within(filters).getByRole("button", { name: "All" }));
    expect(window.location.search).toBe("");
    expect(streetList().getAllByRole("button")).toHaveLength(3);
  });
  it("ignores unknown category links instead of emptying the map", () => {
    window.history.replaceState(null, "", "/?category=not-real");
    renderApp();
    expect(map()).toHaveAttribute("data-focus", "all");
    expect(streetList().getAllByRole("button")).toHaveLength(3);
  });
  it("shows search results on the list and map, separating streets from verified shops", () => {
    renderApp({
      query: "charger",
      matchedStreets: ["first"],
      matchedCategories: [{ slug: "mobile", name: "Mobile" }],
    });
    expect(
      screen.getByRole("heading", { name: "Results for “charger”" }),
    ).toBeVisible();
    expect(screen.getByText("Matching categories: Mobile")).toBeVisible();
    expect(streetList().getAllByRole("button")).toHaveLength(1);
    expect(map()).toHaveAttribute("data-focus", "first");
    expect(
      screen.getByText(/general recommendation, not confirmed stock/),
    ).toBeVisible();
    expect(
      screen.getByText(/No verified shops match this search yet/),
    ).toBeVisible();
  });
  it("handles zero results without plotting anything new", () => {
    renderApp({ query: "zzzz", matchedStreets: [] });
    expect(
      screen.getByRole("heading", { name: "Nothing found yet" }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "No results for “zzzz”",
    );
    expect(map()).toHaveAttribute("data-focus", "");
    expect(screen.getByRole("link", { name: "Clear search" })).toHaveAttribute(
      "href",
      "/",
    );
  });
  it("keeps results without coordinates in the list with name-based directions", async () => {
    renderApp();
    expect(
      screen.queryByRole("button", { name: "Select marker Pending street" }),
    ).not.toBeInTheDocument();
    const pending = streetList().getByRole("button", {
      name: /Pending street/,
    });
    expect(pending).toHaveTextContent("No map location");
    await userEvent.click(pending);
    expect(
      screen.getByText("Map location pending. Directions use the street name."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Google Maps directions to Pending/ }),
    ).toBeVisible();
  });
  it("selects verified shops from the map or list with contact, details and directions", async () => {
    renderApp({ shops });
    expect(map()).toHaveAttribute(
      "data-shops",
      "fixture-phones,fixture-unplotted",
    );
    expect(
      screen.queryByRole("button", {
        name: "Select shop marker Fixture Unplotted",
      }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Select shop marker Fixture Phones" }),
    );
    expect(window.location.search).toBe("?shop=fixture-phones");
    expect(
      screen.getByRole("heading", { level: 2, name: "Fixture Phones" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: /Call shop/ })).toHaveAttribute(
      "href",
      expect.stringContaining("tel:"),
    );
    expect(screen.getByRole("link", { name: /Shop details/ })).toHaveAttribute(
      "href",
      "/shops/fixture-phones",
    );
    expect(
      screen.getByRole("link", { name: /Google Maps directions/ }),
    ).toHaveAttribute(
      "href",
      expect.stringContaining("destination=Fixture+Phones%2C+First+street"),
    );
    await userEvent.click(screen.getByRole("button", { name: "First street" }));
    expect(window.location.search).toBe("?street=first");
    expect(
      within(screen.getByRole("article")).getByRole("button", {
        name: "Fixture Phones",
      }),
    ).toBeVisible();
    await userEvent.click(
      within(screen.getByRole("region", { name: /Verified shops/ })).getByRole(
        "button",
        { name: /Fixture Unplotted/ },
      ),
    );
    expect(
      screen.getByText(/No verified map location. Directions use the shop/),
    ).toBeVisible();
  });
  it("offers non-drag bottom sheet controls and collapses after a selection", async () => {
    const { container } = renderApp();
    const app = container.querySelector(".map-app")!;
    expect(app).toHaveAttribute("data-sheet", "collapsed");
    await userEvent.click(screen.getByRole("button", { name: "Show results" }));
    expect(app).toHaveAttribute("data-sheet", "half");
    const handle = screen.getByRole("button", { name: "Expand results" });
    expect(handle).toHaveAttribute("aria-expanded", "true");
    handle.focus();
    await userEvent.keyboard("{ArrowUp}");
    expect(app).toHaveAttribute("data-sheet", "expanded");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    expect(app).toHaveAttribute("data-sheet", "collapsed");
    await userEvent.click(screen.getByRole("button", { name: "Show results" }));
    await userEvent.click(
      streetList().getByRole("button", { name: /Sea street/ }),
    );
    expect(app).toHaveAttribute("data-sheet", "collapsed");
  });
  it("lets desktop users hide and reopen the result panel", async () => {
    const { container } = renderApp();
    await userEvent.click(screen.getByRole("button", { name: "Hide list" }));
    expect(container.querySelector(".map-app")).toHaveAttribute(
      "data-panel",
      "closed",
    );
    expect(screen.getByRole("button", { name: "Show list" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});
