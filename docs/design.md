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

`StreetExplorer` provides accessible category and street controls, a selected details panel, directions and lazy map activation. `StreetMap` is a client-only dynamic React Leaflet component. It renders a local ODbL road snapshot, needs no provider key, sends no tile/geolocation requests and keeps map attribution visible. Coordinates are source-backed representative street points; stored valid database coordinates take precedence. Unknown streets remain discoverable without fabricated pins. Source records and limitations are in [data-sources.md](data-sources.md).

The map supports marker popups, selected-road highlighting, a selected-street label and zoom controls. Desktop allows panning, while coarse-pointer devices use the street list and zoom controls; scroll-wheel zoom is disabled to prevent scroll trapping. Mobile uses a closer initial zoom to keep neighbouring targets separate. Chunk failures produce a useful retry/directions fallback.

## Responsive and accessible behaviour

The mobile hero places search before the photograph. Four featured categories become two columns; secondary links wrap. Street grids move from three columns to two to one. The homepage shows three featured streets on mobile, with all streets available through its directory link and explorer. Lists and map stack, with a 320px map height. Controls use comfortable target sizes and inputs use 16px text. Navigation, theme disclosure, skip link and Escape focus behaviour remain supported.

Playwright checks all requested widths (320, 360, 375, 390, 430, 768px), plus 1024 and 1440px. Axe exercises both themes, including the loaded mobile map. These checks complement manual screenshot review; they are not comprehensive accessibility certification or physical-device testing.
