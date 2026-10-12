"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  Info,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  X,
} from "lucide-react";
import type { TileConfiguration } from "@/lib/maps/tile-provider";
import type { MapShop, MapStreet } from "@/lib/utils/street-map-data";
import type { Selection } from "./street-map";
import { DirectionsLink } from "./directions-link";
import { ShopContact } from "./shop-contact";
import { SearchForm } from "@/components/search/search-form";
const StreetMap = dynamic(() => import("./street-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading the Pettah map…
    </div>
  ),
});
type Category = { name: string; slug: string };
const sheets = ["collapsed", "half", "expanded"] as const;
type Sheet = (typeof sheets)[number];
const sheetLabels: Record<Sheet, string> = {
  collapsed: "Show results",
  half: "Expand results",
  expanded: "Collapse results",
};
export function DiscoveryApp({
  streets,
  shops,
  query,
  invalidQuery = false,
  matchedStreets,
  matchedCategories = [],
  tiles,
}: {
  streets: MapStreet[];
  shops: MapShop[];
  query: string;
  invalidQuery?: boolean;
  /** Street slugs returned by the search; null when no search is active. */
  matchedStreets: string[] | null;
  matchedCategories?: Category[];
  tiles: TileConfiguration;
}) {
  const params = useSearchParams();
  const [sheet, setSheet] = useState<Sheet>(query ? "half" : "collapsed");
  const [panelOpen, setPanelOpen] = useState(true);
  const [searched, setSearched] = useState(query);
  if (searched !== query) {
    setSearched(query);
    setSheet("half");
  }
  const app = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  const baseStreets = useMemo(
    () =>
      matchedStreets
        ? streets.filter((s) => matchedStreets.includes(s.slug))
        : streets,
    [streets, matchedStreets],
  );
  const chips = useMemo(
    () =>
      Array.from(
        new Map(
          [...baseStreets, ...shops]
            .flatMap((x) => x.categories)
            .map((c) => [c.slug, c]),
        ).values(),
      ).sort((a, b) => a.name.localeCompare(b.name)),
    [baseStreets, shops],
  );
  const requested = params.get("category") ?? "";
  // Unknown or stale category links fall back to all results instead of an empty map.
  const category = chips.some((c) => c.slug === requested) ? requested : "";
  const visibleStreets = useMemo(
    () =>
      baseStreets.filter(
        (s) => !category || s.categories.some((c) => c.slug === category),
      ),
    [baseStreets, category],
  );
  const visibleShops = useMemo(
    () =>
      shops.filter(
        (s) => !category || s.categories.some((c) => c.slug === category),
      ),
    [shops, category],
  );
  const focus = useMemo(
    () =>
      matchedStreets || category
        ? new Set(visibleStreets.map((s) => s.slug))
        : null,
    [matchedStreets, category, visibleStreets],
  );
  const shopSlug = params.get("shop");
  const streetSlug = params.get("street");
  const shop = shopSlug ? shops.find((s) => s.slug === shopSlug) : undefined;
  const street =
    !shop && streetSlug
      ? streets.find((s) => s.slug === streetSlug)
      : undefined;
  const selection: Selection = shop
    ? { kind: "shop", slug: shop.slug }
    : street
      ? { kind: "street", slug: street.slug }
      : null;
  useEffect(() => {
    const root = app.current;
    const sheetElement = panel.current;
    if (!root || !sheetElement) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    const update = () =>
      root.style.setProperty(
        "--map-bottom-inset",
        mobile.matches ? `${sheetElement.offsetHeight}px` : "0px",
      );
    const observer = new ResizeObserver(update);
    observer.observe(sheetElement);
    mobile.addEventListener("change", update);
    return () => {
      observer.disconnect();
      mobile.removeEventListener("change", update);
    };
  }, []);
  // Native history entries integrate with the Next router, so back/forward restores filters and selection.
  function navigate(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes))
      if (value) next.set(key, value);
      else next.delete(key);
    const search = next.toString();
    window.history.pushState(
      null,
      "",
      search ? `?${search}` : window.location.pathname,
    );
  }
  function select(next: NonNullable<Selection>) {
    navigate({
      street: next.kind === "street" ? next.slug : null,
      shop: next.kind === "shop" ? next.slug : null,
    });
    setSheet("collapsed");
  }
  const step = (by: number) =>
    setSheet(
      (s) =>
        sheets[
          Math.min(sheets.length - 1, Math.max(0, sheets.indexOf(s) + by))
        ],
    );
  function onHandleKey(event: KeyboardEvent) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      step(event.key === "ArrowUp" ? 1 : -1);
    }
  }
  const streetShops = street
    ? shops.filter((s) => s.street.slug === street.slug)
    : [];
  const noResults = !!query && !visibleStreets.length && !visibleShops.length;
  const summary = noResults
    ? `No results for “${query}”`
    : `${visibleStreets.length} ${visibleStreets.length === 1 ? "street" : "streets"} · ${visibleShops.length} verified ${visibleShops.length === 1 ? "shop" : "shops"}${query ? ` for “${query}”` : ""}`;
  return (
    <div
      ref={app}
      className="map-app"
      data-sheet={sheet}
      data-panel={panelOpen ? "open" : "closed"}
    >
      <h1 className="sr-only">Find where products are sold in Pettah</h1>
      <div className="app-search">
        <SearchForm
          key={query}
          action="/"
          id="map-search"
          defaultValue={query}
        />
      </div>
      <section
        ref={panel}
        id="discovery-panel"
        className="app-panel"
        aria-label="Results and details"
      >
        <div className="sheet-bar">
          <button
            type="button"
            className="sheet-handle"
            aria-label={sheetLabels[sheet]}
            aria-expanded={sheet !== "collapsed"}
            aria-controls="discovery-results"
            onKeyDown={onHandleKey}
            onPointerDown={(e) => {
              dragStart.current = e.clientY;
              dragged.current = false;
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
              const dy = e.clientY - (dragStart.current ?? e.clientY);
              dragStart.current = null;
              if (Math.abs(dy) > 30) {
                dragged.current = true;
                step(dy < 0 ? 1 : -1);
              }
            }}
            onClick={() => {
              if (dragged.current) dragged.current = false;
              else setSheet(sheets[(sheets.indexOf(sheet) + 1) % 3]);
            }}
          >
            <span className="grip" aria-hidden="true" />
          </button>
          <p className="sheet-summary" role="status">
            {summary}
          </p>
        </div>
        <div className="panel-scroll">
          {invalidQuery && (
            <p role="alert" className="panel-alert">
              Please enter a single query of up to 80 printable characters.
            </p>
          )}
          {shop && (
            <ShopDetail
              shop={shop}
              onClose={() => navigate({ shop: null })}
              onStreet={() =>
                select({ kind: "street", slug: shop.street.slug })
              }
              hasStreet={streets.some((s) => s.slug === shop.street.slug)}
            />
          )}
          {street && (
            <StreetDetail
              street={street}
              shops={streetShops}
              onClose={() => navigate({ street: null })}
              onShop={(slug) => select({ kind: "shop", slug })}
            />
          )}
          <div id="discovery-results" className="panel-results">
            {query && (
              <div className="query-summary">
                <h2>Results for “{query}”</h2>
                {matchedCategories.length > 0 && (
                  <p>
                    Matching categories:{" "}
                    {matchedCategories.map((c) => c.name).join(", ")}
                  </p>
                )}
                <Link href="/" className="text-link">
                  Clear search
                </Link>
              </div>
            )}
            {noResults ? (
              <div className="panel-empty">
                <h2>Nothing found yet</h2>
                <p>
                  Try a broader product name, a category like ‘electronics’, or
                  a street name. Our guide is still growing.
                </p>
              </div>
            ) : (
              <>
                {chips.length > 0 && (
                  <div
                    className="chip-row"
                    role="group"
                    aria-label="Filter by category"
                  >
                    <button
                      type="button"
                      aria-pressed={!category}
                      onClick={() =>
                        navigate({ category: null, street: null, shop: null })
                      }
                    >
                      All
                    </button>
                    {chips.map((c) => (
                      <button
                        type="button"
                        key={c.slug}
                        aria-pressed={category === c.slug}
                        onClick={() =>
                          navigate({
                            category: category === c.slug ? null : c.slug,
                            street: null,
                            shop: null,
                          })
                        }
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
                <section aria-labelledby="street-results">
                  <h2 id="street-results" className="result-heading">
                    {query ? "Streets to explore" : "Shopping streets"}
                    <span>{visibleStreets.length}</span>
                  </h2>
                  {query && visibleStreets.length > 0 && (
                    <p className="result-note">
                      Linked to matching categories — a general recommendation,
                      not confirmed stock.
                    </p>
                  )}
                  <ul className="result-list">
                    {visibleStreets.map((s) => (
                      <li key={s.slug}>
                        <button
                          type="button"
                          aria-pressed={s.slug === street?.slug}
                          onClick={() =>
                            select({ kind: "street", slug: s.slug })
                          }
                        >
                          <MapPin size={18} aria-hidden="true" />
                          <span>
                            <strong>{s.name}</strong>
                            <small>
                              {s.categories.map((c) => c.name).join(" · ")}
                            </small>
                            {!s.point && (
                              <small className="no-location">
                                No map location · directions by name
                              </small>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {!visibleStreets.length && (
                    <p className="result-note">No streets match this search.</p>
                  )}
                </section>
                <section aria-labelledby="shop-results">
                  <h2 id="shop-results" className="result-heading">
                    Verified shops<span>{visibleShops.length}</span>
                  </h2>
                  {visibleShops.length ? (
                    <>
                      <p className="result-note">
                        Published, verified listings
                        {query ? " matching your search" : ""}. Confirm
                        availability with the shop.
                      </p>
                      <ul className="result-list">
                        {visibleShops.map((s) => (
                          <li key={s.slug}>
                            <button
                              type="button"
                              aria-pressed={s.slug === shop?.slug}
                              onClick={() =>
                                select({ kind: "shop", slug: s.slug })
                              }
                            >
                              <ShoppingBag size={18} aria-hidden="true" />
                              <span>
                                <strong>{s.name}</strong>
                                <small>{s.street.name}</small>
                                {!s.point && (
                                  <small className="no-location">
                                    No verified map location
                                  </small>
                                )}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="result-note">
                      {query
                        ? "No verified shops match this search yet. Use the streets above as a starting point."
                        : "No verified shops have been published yet. Street information is shown instead."}
                    </p>
                  )}
                </section>
              </>
            )}
            <section className="map-legend" aria-labelledby="legend-title">
              <h2 id="legend-title">Map key</h2>
              <ul>
                <li>
                  <span className="legend-street" aria-hidden="true">
                    ↗
                  </span>
                  Representative street point (not a shop entrance)
                </li>
                <li>
                  <span className="legend-line" aria-hidden="true" />
                  Street line from OpenStreetMap
                </li>
                <li>
                  <span className="legend-shop" aria-hidden="true">
                    <ShoppingBag size={14} />
                  </span>
                  Verified shop location
                </li>
              </ul>
              <p>
                <Info size={14} aria-hidden="true" /> Map data ©{" "}
                <a href="https://www.openstreetmap.org/copyright">
                  OpenStreetMap contributors
                </a>
                . <Link href="/image-credits">Credits</Link>
              </p>
            </section>
          </div>
        </div>
      </section>
      <div className="app-map">
        <button
          type="button"
          className="panel-toggle"
          aria-controls="discovery-panel"
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen(!panelOpen)}
        >
          {panelOpen ? (
            <PanelLeftClose size={18} aria-hidden="true" />
          ) : (
            <PanelLeftOpen size={18} aria-hidden="true" />
          )}
          {panelOpen ? "Hide list" : "Show list"}
        </button>
        <MapBoundary>
          <StreetMap
            tiles={tiles}
            streets={streets}
            shops={visibleShops}
            focus={focus}
            selection={selection}
            onSelect={select}
          />
        </MapBoundary>
      </div>
    </div>
  );
}
function StreetDetail({
  street,
  shops,
  onClose,
  onShop,
}: {
  street: MapStreet;
  shops: MapShop[];
  onClose: () => void;
  onShop: (slug: string) => void;
}) {
  return (
    <article className="place-detail" aria-labelledby="place-title">
      <div className="place-head">
        <div>
          <span className="eyebrow">Street</span>
          <h2 id="place-title">{street.name}</h2>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {street.categories.length > 0 && (
        <ul className="place-tags" aria-label="Categories">
          {street.categories.map((c) => (
            <li key={c.slug}>{c.name}</li>
          ))}
        </ul>
      )}
      <p>{street.description}</p>
      <p className="location-note">
        {street.point
          ? "Approximate street location from OpenStreetMap · not a shop entrance."
          : "Map location pending. Directions use the street name."}
      </p>
      {shops.length > 0 && (
        <>
          <h3>Verified shops on this street</h3>
          <ul className="place-shops">
            {shops.map((s) => (
              <li key={s.slug}>
                <button type="button" onClick={() => onShop(s.slug)}>
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="place-actions">
        <Link className="action-primary" href={`/streets/${street.slug}`}>
          Explore Street <ArrowRight size={16} />
        </Link>
        <DirectionsLink destination={street.name} compact />
      </div>
    </article>
  );
}
function ShopDetail({
  shop,
  onClose,
  onStreet,
  hasStreet,
}: {
  shop: MapShop;
  onClose: () => void;
  onStreet: () => void;
  hasStreet: boolean;
}) {
  return (
    <article className="place-detail" aria-labelledby="place-title">
      <div className="place-head">
        <div>
          <span className="eyebrow">Verified shop</span>
          <h2 id="place-title">{shop.name}</h2>
        </div>
        <button type="button" aria-label="Close details" onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      <p>
        On{" "}
        {hasStreet ? (
          <button type="button" className="inline-link" onClick={onStreet}>
            {shop.street.name}
          </button>
        ) : (
          shop.street.name
        )}
      </p>
      {shop.categories.length > 0 && (
        <ul className="place-tags" aria-label="Categories">
          {shop.categories.map((c) => (
            <li key={c.slug}>{c.name}</li>
          ))}
        </ul>
      )}
      <ShopContact phone={shop.phone} />
      {!shop.point && (
        <p className="location-note">
          No verified map location. Directions use the shop and street name.
        </p>
      )}
      <div className="place-actions">
        <Link className="action-primary" href={`/shops/${shop.slug}`}>
          Shop details <ArrowRight size={16} />
        </Link>
        <DirectionsLink
          destination={`${shop.name}, ${shop.street.name}`}
          compact
        />
      </div>
    </article>
  );
}
class MapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="map-loading" role="status">
        <h2>The map could not load.</h2>
        <p>Use the result list and directions to keep exploring.</p>
        <button
          className="map-load-button"
          onClick={() => this.setState({ failed: false })}
        >
          Try the map again
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
