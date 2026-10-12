# Map-first discovery app — 12 October 2026

## Starting point (phase 1 inventory)

The homepage was a marketing page: photo hero with search, featured category tiles, six street cards and, at the bottom, `StreetExplorer` (a category `<select>`, street list and a lazily loaded Leaflet map). Search submitted to `/search`, a separate card page. `StreetMap` drew real OSM/CARTO raster tiles, representative street points from `src/data/street-locations.json`, the selected street's OSM geometry, popups, and tile failure/retry. Published shops (`publicShopWhere`) were never plotted. The street detail page embedded a second `StreetExplorer`.

Reused unchanged: the Prisma repositories (`discovery().search/streets`, `shops().list`), query normalization (`parseQuery`), `streetMapData` provenance matching and `validPettahPoint`, the tile provider policy, `DirectionsLink`, `ShopContact`, `SearchForm`, theme provider, CSP and the data pipeline.

## Layout

- `/` renders `DiscoveryApp` directly: a compact full-width header, then a viewport-height grid (`100dvh` with a `100vh` fallback) with a 300–400px sidebar and the map filling the rest. The page itself never scrolls; the sidebar scrolls on its own. “Hide list” collapses the sidebar and “Show list” reopens it.
- Directory routes moved into the `(directory)` route group, which adds the footer. URLs are unchanged.
- Mobile (<768px): the map fills the viewport, search floats at the top, and results live in a bottom sheet with collapsed, half and expanded states. The handle is a button: tap or click cycles the states, ArrowUp/ArrowDown step through them, and a vertical drag of more than 30px moves one state. Leaflet zoom controls sit below the search bar. Attribution and the map buttons ride above the sheet using its measured height (`--map-bottom-inset`). Safe-area insets are respected.

## Search ↔ map

- The text query (`q`) runs on the server through the existing `discovery().search` and `shops().list` code. The search form uses `next/form` with `action="/"`, so a search updates the app without a full reload or a new map instance.
- Category (`category`), street (`street`) and shop (`shop`) selection are client state stored in the URL with `history.pushState`. Next keeps `useSearchParams` in sync with `pushState`, so links are shareable and back/forward restores filters and selections. Unknown categories are ignored.
- Matching streets are emphasized. Other streets stay visible but muted, as markers and lines. The map fits to matching locations whenever the results change, and “Fit to results” and “Reset map” are always available.
- Street results are labelled as category-based recommendations, not confirmed stock. Verified shops are listed separately. Results without coordinates stay in the list with “No map location” and use name-based directions. They are never placed at an invented position.
- Zero results show a message and a “Clear search” link, and every street is drawn muted.

## Map features

- Street markers are round pins at representative OSM nodes. Lines come from the matched OSM ways (`pettah-roads.json`). Selecting a street fits its line, or centres its point, inside the visible area between the search bar and the sheet.
- Shop markers are rounded squares with a bag icon. Only published + verified shops with their own valid Pettah coordinates get one. In development none exist yet, so no shop markers appear, by design.
- Selecting from the map or the list opens a compact detail card. A street card shows its name, categories, a location-precision note, verified shops on the street, “Explore Street” and “Directions”. A shop card shows its name, street, categories, recorded phone, a location note, “Shop details” and “Directions”.
- Under `prefers-reduced-motion`, pan, zoom and fade animations are off. View changes requested during a zoom animation are retried after it ends; Leaflet would otherwise drop them.
- Geolocation was not added. `Permissions-Policy: geolocation=()` stays in place.

## Themes

Light is the default (`next-themes`, `defaultTheme="light"`). Light, dark and system are offered and persisted, and the class strategy avoids hydration mismatches. All shell surfaces use the existing tokens. With CARTO configured, dark mode switches to CARTO's real `dark_all` basemap. OSM Standard has no dark style, so its light tiles are kept unchanged, which stays readable.

## Verification

- Unit + data pipeline (Vitest): 76 tests (42 unit), including 11 for `DiscoveryApp` (initialization, list/marker/URL sync, back navigation, category filtering, unknown filters, search vs verified shops, zero results, no-coordinate fallback, shop details/directions, sheet controls, panel toggle) and shop coordinate validation.
- Integration (PostgreSQL): 18 tests.
- Browser (Playwright, production build, synthetic tile fixture): 16 scenarios, listed in [testing.md](testing.md). They include assertions that street lines are never Leaflet's default blue: in production builds react-leaflet ignores a `className` inside `pathOptions`, so it is passed at construction.
- Real tiles: on the production build against the development database, OSM Standard served 20/20 (desktop light, search + selection), 20/20 (desktop dark) and 12/12 (390px, selected street) HTTP 200 tile responses. There were zero console or page errors and no horizontal overflow. Screenshots are in `.local/redesign/real-map-*.png`, with test captures in `.local/screenshots/map-*.png`.

## Limitations

- No published shops exist yet, so shop markers have only been verified with isolated test fixtures.
- Street points are representative OSM nodes, not surveyed entrances. Street matches come from category associations, not stock data.
- Live CARTO tiles (light and dark) still need a production key and have not been verified.
- The 2007 market photograph is no longer shown on the homepage. The image file and its credits page remain.
