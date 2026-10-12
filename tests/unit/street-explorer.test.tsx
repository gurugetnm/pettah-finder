import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MapStreet } from "@/components/discovery/street-explorer";
const observer = vi.hoisted(() => ({
  callback: undefined as IntersectionObserverCallback | undefined,
}));
vi.mock("next/dynamic", () => ({
  default: () =>
    function MapStub({
      streets,
      selected,
      onSelect,
    }: {
      streets: MapStreet[];
      selected: string;
      onSelect: (slug: string) => void;
    }) {
      return (
        <div data-testid="interactive-map" data-selected={selected}>
          {streets.map((s) => (
            <button key={s.slug} onClick={() => onSelect(s.slug)}>
              Select marker {s.name}
            </button>
          ))}
        </div>
      );
    },
}));
import { StreetExplorer } from "@/components/discovery/street-explorer";
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
const tiles = {
  provider: "osm-standard" as const,
  url: "fixture",
  attribution: "fixture",
  maxZoom: 19,
};
beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: IntersectionObserverCallback) {
        observer.callback = cb;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  observer.callback = undefined;
});
describe("street explorer", () => {
  it("loads when visible, without a manual activation screen", () => {
    render(<StreetExplorer streets={streets} tiles={tiles} />);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading the Pettah map",
    );
    expect(
      screen.queryByRole("button", { name: "Explore the street map" }),
    ).not.toBeInTheDocument();
    act(() =>
      observer.callback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getByTestId("interactive-map")).toBeVisible();
  });
  it("synchronizes list and marker selection, category filtering and directions", async () => {
    render(<StreetExplorer streets={streets} tiles={tiles} />);
    const list = screen.getByRole("group", { name: "Choose a street" });
    await userEvent.click(
      within(list).getByRole("button", { name: /Sea street/ }),
    );
    expect(screen.getByTestId("interactive-map")).toHaveAttribute(
      "data-selected",
      "sea",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Select marker First street" }),
    );
    expect(
      within(list).getByRole("button", { name: /First street/ }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("link", { name: /Google Maps directions/ }),
    ).toHaveAttribute("href", expect.stringContaining("destination=First"));
    await userEvent.selectOptions(screen.getByRole("combobox"), "jewellery");
    expect(within(list).getAllByRole("button")).toHaveLength(1);
    expect(screen.getByTestId("interactive-map")).toHaveAttribute(
      "data-selected",
      "sea",
    );
    expect(
      screen.queryByRole("button", { name: "Select marker First street" }),
    ).not.toBeInTheDocument();
  });
  it("keeps missing-location streets available through their guide and directions", async () => {
    render(<StreetExplorer streets={streets} tiles={tiles} />);
    await userEvent.click(
      within(screen.getByRole("group", { name: "Choose a street" })).getByRole(
        "button",
        { name: /Pending street/ },
      ),
    );
    expect(
      screen.getByText("Map location pending. Directions use the street name."),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Explore Street" }),
    ).toHaveAttribute("href", "/streets/pending");
  });
});
