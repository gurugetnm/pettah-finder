# Public city guide design system

The city guide redesign continues the Next.js 16.4 App Router, PostgreSQL/Prisma repositories, normalized search, category relationships and public shop visibility rules. No schema, authentication or administration scope was introduced.

## Visual language

Warm paper (`#faf9f6`), ink (`#171717`), white surfaces and a contrast-safe terracotta (`#b34220`) frame authentic neighbourhood photography. The supplied orange direction is adjusted for readable text/buttons. Dark mode uses charcoal/olive surfaces, warm light text and peach actions, including map surfaces and controls. DM Sans and Plus Jakarta Sans remain self-hosted with OFL notices. Content spans up to 1328px, with 16–32px responsive gutters. Cards use 16–20px corners, restrained borders and visible focus states. Motion respects reduced-motion preferences.

## Discovery hierarchy

- Home (`/`): the map-first discovery app — a full-height real-tile map with a search/results sidebar on desktop and a bottom sheet on mobile. No marketing hero, category tiles or street-card sections. See [map-first-app.md](map-first-app.md).
- Categories: all database categories with names/descriptions and working links to filtered streets. Original icon compositions are generic illustrations, not invented product/shop photographs.
- Streets: real category relations, original descriptions, geographic illustrations and separate explore/directions actions. Illustrations use source road geometry rather than repeating an unrelated photograph across named streets.
- Search: existing query parsing/aliases and result ordering retained; readable cards for streets, categories and verified shops. An explicit qualified state explains when no verified shops match.
- Street guide: breadcrumbs, primary directions, a “View on map” link into the map app (`/?street=slug`), local road illustration, categories/products, existing verified shop access and related streets selected from shared category relations.
- Shops: existing factual directory/filters/details and honest empty states retained; improved shared typography and card styling.
- Credits: public photography source/author/license/transformations and OSM attribution linked from photo and footer.

## Interactive mapping

`DiscoveryApp` (home page) owns search results, category filters and selection, all kept in the URL (`q`, `category`, `street`, `shop`). It drives one client-only dynamic Leaflet `StreetMap` that renders actual OSM-compatible raster tiles, street points and source-backed street lines, verified shop markers, fit/reset controls and visible attribution. Local viewing uses OSM Standard; public production requires a configured CARTO basemap key (with a real CARTO dark basemap in dark mode). Loading, configuration and tile failure/retry states keep the result list and directions usable. Full provider, policy and provenance details are in [map-implementation.md](map-implementation.md); the app shell is described in [map-first-app.md](map-first-app.md).

## Responsive and accessible behaviour

On mobile the home map fills the viewport under the header, search floats at the top and results live in a bottom sheet (collapsed, half, expanded) operable by tap, keyboard arrows or drag. Directory pages keep their grids: street cards move from three columns to two to one. Controls use comfortable target sizes and inputs use 16px text. Navigation, theme disclosure, skip link and Escape focus behaviour remain supported.

Playwright checks all requested widths (320, 360, 375, 390, 430, 768px), plus 1024 and 1440px. Axe exercises both themes, including the loaded mobile map. These checks complement manual screenshot review; they are not comprehensive accessibility certification or physical-device testing.
