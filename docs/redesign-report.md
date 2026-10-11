# Pettah Finder — city guide redesign

Implemented in the existing repository, 12 October 2026. Starting commit: `08363df`. PostgreSQL, Prisma schema, discovery repositories, shop visibility rules, search normalization, public routes, environment configuration, metadata and CI remain in place. No destructive database operations or fabricated shop data were introduced.

## Delivered experience

The homepage now has a photo-led split hero, prominent working GET search, practical suggestions, four featured category illustrations and compact links for the remaining database categories. Geographic street cards expose real category relationships, original descriptions and separate guide/directions links. An interactive explorer ties category filtering, a street list, selected-street details, representative map pins and Google Maps directions together.

Street guides now include a geographic introduction, products/categories from existing queries, existing verified shop access, a map and related streets based on shared category relations. Search results retain their original business logic while using the new cards and explicitly explaining when no verified shop matches. The functional shop directory remains available through desktop/mobile navigation, with improved shared typography and card presentation.

## Pages and components

Pages affected: `/`, `/categories`, `/streets`, `/streets/[slug]`, `/search`, `/shops` and `/shops/[slug]` (directories/shop pages reuse changed shared styles/components). New `/image-credits` route documents assets publicly.

Updated shared header, footer, search form, category/street cards, and design tokens. Added `MarketPhoto`, `CategoryDiscovery`, `StreetVisual`, `StreetExplorer`, `StreetMap`, map error fallback and typed `streetMapData` serialization. Interactive mapping is isolated to client components; repository access and page content remain server-rendered. Existing loading/error/404 surfaces inherit the design system.

## Design decisions

Warm paper, ink, white cards and contrast-safe terracotta emphasize shopping and place. Self-hosted DM Sans and Plus Jakarta Sans remain. Readable navigation/supporting text, responsive gutters, compact category links, strong image/map surfaces and clear actions replace the empty centered composition. Dark mode uses intentional charcoal surfaces and peach highlights, including map controls/roads/pins. Mobile puts search before photography, uses two featured category columns, features three homepage streets, and stacks street controls above the map.

## Photography and licensing

The locally stored 1600px WebP hero (315KB) is McKay Savage’s Pettah market photograph from 15 October 2007, [Wikimedia Commons source](<https://commons.wikimedia.org/wiki/File:Sri_Lanka_-_012_-_Market_street_around_Fort_Stn_%26_Harbour_(1630266755).jpg>), [CC BY 2.0](https://creativecommons.org/licenses/by/2.0/). It is labelled historical neighbourhood context, with visible source/credit links and documented resize/conversion/display crops. Next Image supplies responsive optimization, eager hero loading and reserved dimensions. Category artwork is original interface composition using existing ISC-licensed Lucide icons. No unrelated product/store photographs were substituted.

## Mapping

Leaflet 1.9.4 and React Leaflet 5 render a local 115KB OpenStreetMap road snapshot rather than requesting third-party tiles. There are no provider keys, subscription costs, tile usage limits, public tile-server traffic or geolocation requests. The map loads on activation through a client-only dynamic import. Local data permits mapping even if external tile services fail; a chunk error has retry and guide/directions fallback.

All six supplied street points are taken from actual nodes in name-matched OSM way geometry, with IDs and source names retained. This is source validation, not field verification. Existing valid database coordinates take precedence; unknown locations do not acquire fabricated pins. The snapshot is ODbL; attribution appears on cards/map and the public credits page. The map is a compact street finder, not a global/live basemap. Source URLs, method and reuse terms are in [data-sources.md](data-sources.md).

Marker clicks open popups, update the details panel and highlight the street. Category filters affect list and markers. Selected streets have labels and directions. Scroll-wheel zoom is disabled; coarse-pointer devices use list selection and zoom controls, avoiding scroll trapping. Closer mobile zoom prevents pin collisions while list selection reaches streets outside the current viewport.

## Verification

- Node 24.18.0 / pnpm 11.22.0, existing project-local PostgreSQL cluster; isolated `pettah_test` database for integration/browser tests. No schema migrations required.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`: passed.
- `pnpm test`: 22 unit tests passed.
- `pnpm test:integration`: 7 tests passed, including query/data visibility contracts.
- `pnpm build`: production compilation/type checking and route generation passed.
- `pnpm audit --prod`: no known vulnerabilities found.
- `pnpm test:e2e`: 11 Chromium scenarios passed against production server.
- Responsive: no horizontal overflow at 320, 360, 375, 390, 430, 768, 1024 and 1440px across homepage, category directory, street directory/detail, search and shop directory. Isolated shop detail fixtures additionally cover narrow/mobile/desktop sizes.
- Accessibility: axe WCAG A/AA (including WCAG 2.2) and best-practice checks pass in light/dark across public routes, empty/404 states, shop fixtures and loaded mobile map. Keyboard skip navigation, menu/theme Escape dismissal and focus restoration pass. Map controls/markers use 44px targets; the mobile overlap caught during testing was corrected through closer zoom.
- Functional: product search journey, category URLs, filters, invalid queries, 404 statuses, safe directions, verified-shop visibility, health, security headers, sitemap and robots pass. New map filtering/popup/directions tests pass.
- Visual review: before screenshot; after home/search/street screenshots at 1440px light and 390px light/dark; separate mobile hero/loaded map close-ups reviewed. Captures are under ignored `.local/screenshots/` and `.local/redesign/`.

Two early browser failures were ambiguous selectors after adding additional directions/search controls; tests were scoped to their intended regions. A genuine mobile target overlap was subsequently fixed. No failing checks were ignored. These results do not claim physical-device testing, an exhaustive accessibility certification, field surveys, a production performance benchmark or a remote CI run.

## Incremental Git commits

1. `eccac7f` — `refactor(ui): establish city guide redesign foundation`
2. `be13b13` — `feat(ui): create photo-led hero and prominent marketplace search`
3. `863d26b` — `feat(ui): replace category tiles with featured shopping discovery`
4. `a9fdaf6` — `feat(ui): add geographic street cards with sourced OSM illustrations`
5. `0673dbf` — `feat(discovery): add local street map and destination guide layouts`
6. Final QA commit — `test(ui): verify responsive discovery and accessible street mapping` (its hash is reported in the delivery message).

No code was pushed and no deployment was performed. Preview remains available through the local development server.

## Remaining content and operational limitations

Current street/category associations remain preliminary. No individual businesses are seeded; real verified listings will appear through the existing backend. Current, individually verified photographs of each street/category/shop still need sourcing; geographic and generic category illustrations deliberately fill those gaps. The OSM snapshot should be refreshed when road data changes. Existing non-failing pg integration deprecation and Playwright color-environment notices remain. Real production origin/database provisioning remains an existing deployment concern.
