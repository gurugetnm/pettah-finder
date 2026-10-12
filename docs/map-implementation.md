# Real interactive Pettah map — 12 October 2026

## Diagnosis

The old initial screen was a manual activation gate with a CSS pattern. After activation, Leaflet drew a local road snapshot without a `TileLayer`. Therefore there were no tile requests at all, rather than tiles failing. The old CSP would also have blocked external tile images. Leaflet CSS, container height, dynamic import and hydration worked without browser errors. Touch dragging was explicitly disabled. See [map-audit.md](map-audit.md).

## Implementation

`StreetExplorer` retains category/list/panel state and loads the dynamically imported browser-only `StreetMap` when the map area approaches the viewport (IntersectionObserver, cleaned up after activation). There is no activation button, overlay or decorative map background. Loading, unavailable-configuration, partial/failed tile requests and retry are explicit states; directions and the accessible street list remain available.

`StreetMap` uses React Leaflet 5 / Leaflet 1.9, real raster `TileLayer` images, pan/drag, touch pinch zoom, 44px zoom controls and markers, selected-street geometry/marker highlighting, popups, existing street links and Google directions. Scroll-wheel zoom is disabled to preserve page scrolling. A ResizeObserver invalidates the map dimensions after layout/viewport changes and is cleaned up. Leaflet CSS is imported at the map boundary; map dimensions are explicit and stacked on mobile. DivIcon markers avoid broken external marker asset paths. No new mapping package, global SSR disablement or database/schema mutation was introduced.

The initial mobile zoom keeps close markers separate; list selection pans to streets outside that view. Category filtering updates both the list and markers, and a valid remaining selection drives the details. Source IDs and name matches determine selected geometry, rather than rendering the entire road snapshot as a substitute for tiles.

Street-card/detail introductions now use clean non-map neighbourhood identity surfaces. No unsupported street photographs, static-map screenshots or six embedded Leaflet instances were substituted.

## Tile provider and deployment

Local development and explicitly localhost/127.0.0.1 site origins use **OpenStreetMap Standard**, `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, max zoom 19. Current [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/) allows normal low-volume interactive viewing with attribution, accurate Referer and browser User-Agent, and native HTTP caching. The application uses normal `<img>` tile requests, `strict-origin-when-cross-origin`, no proxy, no cache-busting parameters/no-cache headers, no offline storage and no bulk download. `keepBuffer=0` and idle updates limit requests to the viewed area. OSM Standard is best-effort and is not the public-production default.

For a public production origin, obtain a **CARTO Basemaps client-visible key**, accept its [Basemap Terms](https://carto.com/legal/basemap-terms/), and set:

```dotenv
SITE_URL=https://your-real-site.example
MAP_TILE_PROVIDER=carto
NEXT_PUBLIC_CARTO_BASEMAP_KEY=your-public-basemap-only-key
```

Only a public basemap key belongs here. Use origin restrictions where supported by the provider and monitor quota. Never substitute a database password, server CARTO credential or unrelated secret. The key is intentionally visible in browser tile requests. There is no invented/sample production key or attempt to bypass provider identification.

CARTO [publishes](https://carto.com/basemaps/) raster Voyager tiles (zoom 0–20), a key requirement, and free allowances of 5 million tile requests/month for noncommercial use and 1 million/month for commercial use; confirm terms/quota for the actual deployment. Above those limits, the provider requires a paid plan. This project uses the official `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=…` endpoint, with visible **© OpenStreetMap contributors, © CARTO** attribution. No production CARTO key was available in this task, so live CARTO requests are not claimed as verified. Missing/invalid configuration produces an explicit unavailable state instead of silently using public OSM tiles in production.

CSP admits only the two specific HTTPS image origins used here. Tiles are loaded directly as images; no broader script/connect/frame permissions were added. Other image origins remain blocked. Geographic tile colours stay intact in dark mode; UI controls/popups retain the existing dark design tokens.

## Geographic provenance

The six representative locations come from the retained OSM API snapshot requested for bounding box `79.847,6.932,79.861,6.943` on 12 October 2026. `src/data/street-locations.json` records stable slug, source way/name, exact source node, coordinates, retrieval date, precision and ODbL license. Every representative point is an actual geometry node; no coordinates were guessed or computed from name similarity.

- 1st Cross Street: [way 10548321](https://www.openstreetmap.org/way/10548321)
- 2nd Cross Street: [way 10548298](https://www.openstreetmap.org/way/10548298)
- Maliban Street: [way 10548310](https://www.openstreetmap.org/way/10548310)
- Prince Street: [way 10548335](https://www.openstreetmap.org/way/10548335)
- Sea Street: [way 34695077](https://www.openstreetmap.org/way/34695077)
- Main Street: [way 625320319](https://www.openstreetmap.org/way/625320319)

`streetMapData` matches the stable slug and exact source name, validates the point within Pettah regional bounds, and checks that selected geometry has the recorded source way/name and contains the representative node. Valid recorded database coordinates take precedence. Missing, nonfinite, partial or unrelated regional coordinates do not become fabricated markers; unknown streets retain their list/details/directions. Coordinate validity and source matching are not claims of a field survey or precise business entrance. Popup and map captions identify representative/approximate street locations.

The geographic snapshot remains © OpenStreetMap contributors, ODbL. Existing shop pipeline and source attribution are untouched. See [data-sources.md](data-sources.md) for the original retrieval and licensing records.

## Verification strategy

Unit tests cover all six source/geometry matches, valid/missing/invalid/renamed locations, production/local provider configuration, viewport-driven initialization, two-way selection, category filtering and missing-location fallback. Existing directions normalization tests remain.

Browser tests intercept tiles with clearly synthetic raster fixtures for deterministic selection, filter, zoom, pan, resize, failure/retry, accessibility and breakpoint sweeps. Those fixtures are not evidence of real geography. This avoids public OSM traffic from automated panning/zooming and repeated runs. Separately, a limited real desktop viewport inspection received **12 HTTP 200 PNG tile responses**, with provider cache headers, visible geographic context and attribution, and **zero browser console/page errors**. Screenshot: `.local/redesign/real-map-desktop.png`. A real mobile viewport loaded **6 HTTP 200 tile responses**, with zero page errors and no horizontal overflow; `.local/redesign/real-map-mobile.png` was visually reviewed.

Do not confuse a rendered map container or mocked raster fixtures with successful real tile loading. Live CARTO remains dependent on a deployment key; CI interaction tests do not contact CARTO or public OSM.

## Final verification and commits

Passed: ESLint, TypeScript, Prettier, production build, 18 PostgreSQL integration tests, 14 production Chromium scenarios, and 67 unit/data-pipeline tests. Browser tests cover all six mapped streets, marker-to-list selection, category filters, popups, directions, actual Leaflet dragging and zoom controls, tile failure/retry, loaded raster fixture images, both themes/axe accessibility, and widths 320/375/390/430/768/1024/1440px (the wider discovery suite additionally covers 360px). Mobile map height is asserted at 320px. Synthetic tile fixtures are used only for repeatable automation; real network responses were checked separately as described above.

One early every-street test raced Leaflet's popup removal animation; it now waits for the popup to be removed before opening another. This was a test synchronization fix. The final full suite passes. Existing search, directory, verified-shop visibility, security headers, metadata and route tests still pass. No data pipeline or database business records were changed. Existing non-failing pg deprecation and Playwright color-environment notices remain.

Commits:

- `36c5c0c` — `fix(map): remove activation placeholder and configure permitted tiles`
- `7f0b540` — `feat(map): render real geographic tiles with synchronized street selection`
- `7b3ebaf` — `test(map): verify geographic data, tile recovery and street interactions` .
- Map documentation commit — `docs(map): document provider setup and representative location provenance` (final hash in delivery message).

Remaining requirement: public production deployments need the public CARTO basemap key. No such key was provided, so live CARTO verification is pending; local OSM Standard is fully working and verified. Locations are source-backed street representatives, not surveyed entrances, and licensed street photography is still unavailable for cards.
