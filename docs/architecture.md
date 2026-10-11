# Architecture

One Next.js application serves public pages with App Router Server Components. PostgreSQL remains the source of truth; working Prisma integration was retained during scope simplification. There are no accounts, account roles, write endpoints, admin pages, queues or independent services.

- `src/app`: home, search, categories, street listing/detail, shop listing/detail, SEO routes and read-only database health.
- `src/features/discovery`: server-only repositories. Validated requests become typed Prisma queries; category/product aliases determine street matches. A shared `publicShopWhere` predicate requires both PUBLISHED and VERIFIED in shop queries and street-linked shop listings. Street details filter shops by the same publication criteria. Search returns streets/categories and separately matching public shops.
- `src/lib/db`: lazily constructed, process-reused Prisma client with the PostgreSQL adapter. Pool max 5, connect timeout 5 seconds. No client component imports this module.
- `src/lib/validations`: Zod query, slug and filter validation plus dedicated test database guard. Search uses NFKC, whitespace normalization and case-insensitive PostgreSQL matching.
- `src/lib/utils`: Tailwind class merging, validated site origin, encoded Google Maps URLs.
- `src/components`: reusable presentation cards, native GET search form, shadcn-style Radix Button, directions links, original SVG market illustration, shared header/footer. Type-only repository imports do not pull server code into components.
- `prisma`: committed schema, migrations and deterministic development seeds.
- `tests`: unit/components, real PostgreSQL integration and production-server browser tests.

Data flow: URL query → validation → server-only repository → parameterized Prisma query → Server Component → HTML. GET forms keep filters in shareable URLs. Invalid duplicate/overlong queries return helpful feedback and do not execute searches. Unknown or unpublished listing slugs call `notFound()`. PostgreSQL failures reach the generic Next.js error boundary; health returns a generic 503.

The shared header and theme provider are client components for mobile menu and theme state. `next-themes` initializes system/local preference before hydration. Controls use fixed accessible labels so SSR does not depend on client-only preference values. Native forms and listing pages require no custom browser state library. Light/dark variables, minimal animations and system fonts keep the initial page light and avoid font-download layout shifts.

Public database pages are rendered at request time; React `cache` only deduplicates individual detail queries within a request. There is no personalized data. Sitemap URLs are derived from the same public repositories and a configured origin. Search pages are noindex. Directory filters canonicalize to their base directory. Query limits are explicit in repositories; the current six-street dataset needs no pagination.

Google Maps is a plain outbound link built using its documented `api=1` directions URL. It adds no map SDK, API key or client-side geolocation requirement. Destination names are encoded and users are asked to verify the result. No geographic coordinates are guessed.
