# Public city guide design system

The city guide redesign continues the Next.js 16.4 App Router, PostgreSQL/Prisma repositories, normalized search, category relationships and public shop visibility rules. No schema, authentication or administration scope was introduced.

## Visual language

Warm paper (`#faf9f6`), ink (`#171717`), white surfaces and a contrast-safe terracotta (`#b34220`) frame authentic neighbourhood photography. The supplied orange direction is adjusted for readable text/buttons. Dark mode uses charcoal/olive surfaces, warm light text and peach actions, including map surfaces and controls. DM Sans and Plus Jakarta Sans remain self-hosted with OFL notices. Content spans up to 1328px, with 16–32px responsive gutters. Cards use 16–20px corners, restrained borders and visible focus states. Motion respects reduced-motion preferences.

## Discovery hierarchy

- Home: split photo/search hero, native GET search, suggestion links, four featured illustrated categories, remaining categories as compact browse links, geographic street cards and a filterable map explorer.
- Categories: all database categories with names/descriptions and working links to filtered streets. Original icon compositions are generic illustrations, not invented product/shop photographs.
- Streets: real category relations, original descriptions, geographic illustrations and separate explore/directions actions. Illustrations use source road geometry rather than repeating an unrelated photograph across named streets.
- Search: existing query parsing/aliases and result ordering retained; readable cards for streets, categories and verified shops. An explicit qualified state explains when no verified shops match.
- Street guide: breadcrumbs, primary directions, local road illustration, categories/products, existing verified shop access, map and related streets selected from shared category relations.
- Shops: existing factual directory/filters/details and honest empty states retained; improved shared typography and card styling.
- Credits: public photography source/author/license/transformations and OSM attribution linked from photo and footer.

## Interactive mapping

`StreetExplorer` preserves category/list/selection state and initializes the client-only dynamic Leaflet map on viewport entry. The map renders actual OSM-compatible raster tiles, supports desktop/mobile pan/zoom and marker/list synchronization, and includes visible attribution. Local viewing uses OSM Standard; public production requires a configured CARTO basemap key. Loading, configuration and tile failure/retry states preserve accessible street directions. Card visuals are lightweight non-map neighbourhood surfaces pending verified photographs. Source-backed selected road geometry is an overlay, not a basemap substitute. Full configuration, policy, provenance and verification details are in [map-implementation.md](map-implementation.md).

## Responsive and accessible behaviour

The mobile hero places search before the photograph. Four featured categories become two columns; secondary links wrap. Street grids move from three columns to two to one. The homepage shows three featured streets on mobile, with all streets available through its directory link and explorer. Lists and map stack, with a 320px map height. Controls use comfortable target sizes and inputs use 16px text. Navigation, theme disclosure, skip link and Escape focus behaviour remain supported.

Playwright checks all requested widths (320, 360, 375, 390, 430, 768px), plus 1024 and 1440px. Axe exercises both themes, including the loaded mobile map. These checks complement manual screenshot review; they are not comprehensive accessibility certification or physical-device testing.
