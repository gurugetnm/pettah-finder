# Pettah Finder

**Find the right street. Discover the right shop.**

A lightweight public shopping guide for Pettah, Colombo. Search products and aliases, explore categories and streets, browse verified shops, and open Google Maps directions. No accounts, admin dashboard, payment flows, submissions or separate backend.

## What works

- Map-first homepage: a full-height Pettah map with search, category filters, street/shop selection and directions in a sidebar (desktop) or bottom sheet (mobile); light by default with a dark mode.
- Shareable search (`/search?q=charger`) across products, aliases, categories, street names and public shop listings.
- Category directory, filtered streets and individual street pages with related products.
- Shop directory with product/category/street filters and public shop detail pages. Only published, verified shops appear.
- Google Maps directions by street/business name; no API key or fabricated map pins.
- System-initialized light/dark themes, keyboard navigation, skip link, reduced motion, loading/error/empty/not-found states.
- Titles, descriptions, canonical URLs, Open Graph/Twitter metadata, sitemap and robots.
- PostgreSQL/Prisma migrations, repeatable non-destructive seeds, Vitest/Testing Library/Playwright coverage and GitHub Actions CI.

The development seed includes **6 streets, 12 categories, 13 products and no shops**. Street/category associations are preliminary. Exact coordinates, individual businesses, phone numbers, ratings and hours have not been invented. Shop detail functionality is verified with isolated automated test fixtures.

## Stack

Next.js 16.4 App Router, React 19.3, strict TypeScript, Tailwind 4, custom Radix-based Button, Lucide, Zod, PostgreSQL 17 and Prisma 7.10 with the pg driver adapter. Node 24 LTS and pnpm 11.22.0 are selected for reproducibility. Prisma is pinned to stable 7.10 rather than the registry's Prisma 8 release candidate.

## Local setup

Prerequisites: Node 24, pnpm 11.22.0, Git and PostgreSQL 17+. Use the versions in `.node-version` and `package.json`.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:local
pnpm db:generate
pnpm db:deploy
pnpm db:seed
pnpm dev
```

Open http://localhost:3000. `db:local` creates an ignored project-local PostgreSQL cluster at `.local/postgres`, bound to **127.0.0.1:55432**, with separate `pettah_dev` and `pettah_test` databases. It needs PostgreSQL binaries on PATH (`brew install postgresql@17` on macOS, or your system package manager). It preserves an existing cluster and never resets a database. Local-only trust authentication is a development convenience; do not use it remotely. Stop it with `pnpm db:local:stop`.

For an existing PostgreSQL installation, create separate development and test databases yourself and set their URLs in the ignored `.env`. Skip `db:local`. The development seed deliberately refuses remote databases, production mode and database names other than `pettah_dev`/`pettah_test`.

Environment variables are documented in `.env.example`: server-only `DATABASE_URL`, guarded `TEST_DATABASE_URL`, and optional `SITE_URL` (local fallback). Production must set `SITE_URL` to the real HTTPS origin. Never commit credentials.

## Commands

```sh
pnpm dev                 # local development
pnpm db:generate         # generate ignored Prisma client
pnpm db:migrate          # create/apply a development migration
pnpm db:deploy           # apply committed migrations (no reset)
pnpm db:seed             # repeatable local development seed
pnpm check               # format, lint, typecheck, unit/components
pnpm test:integration    # deploy migrations to guarded test DB, test relations/search
pnpm build               # generate client and production build
pnpm exec playwright install chromium
pnpm test:e2e            # migrate/seed test DB, start production server at :3100
pnpm start               # serve the production build
pnpm audit --prod        # production dependency audit
pnpm audit               # includes development tools; see security notes
```

Integration and E2E tests **require** a separate local `TEST_DATABASE_URL` whose database name ends in `_test`. They never fall back to the development URL and never drop or reset a database. E2E owns port 3100 and refuses to reuse an existing server. Run `pnpm build` before E2E.

## Data maintenance and deployment

Data is maintained through `prisma/seed-data.ts`, reviewed scripts and migrations. There is no application write API. See [data sources](docs/data-sources.md), [database guide](docs/database.md) and the [data pipeline](docs/data-pipeline.md) (`pnpm data:*` commands) before adding shops. The development seed will not publish real businesses; collect and verify actual information before adding listings through a reviewed database script.

Deploy the Next.js app to Vercel or a Node host with managed PostgreSQL. Install with the frozen lockfile and build with `pnpm build`. Apply `pnpm db:deploy` using a migration role in a controlled release step; give the application a separate SELECT-only role. Do not run the local seed in production. CI runs checks and has no deployment step. Migration credentials and runtime credentials can both be supplied through `DATABASE_URL` in their respective execution environments; no browser-exposed connection string is used.

## Limits and next work

The public shop directory starts empty pending verified, licensed business data. Google Maps resolves name-based destinations; confirm its result before travelling. Searches are bounded PostgreSQL substring queries suitable for a small directory; there is no inventory or availability guarantee. Lists are capped at 50, search categories at 24 and search streets at 30; pagination is the next step if the dataset grows.

The full dependency audit currently reports a development-only `braces` advisory with no patched release in the registry. Runtime audit is clean as of the recorded verification. See [security decisions](docs/security.md).

Next: gather permissioned shop data, record its provenance and verification date, publish a small real directory, and add pagination as required. Stay focused on public discovery.

Further reading: [map-first app](docs/map-first-app.md), [design system](docs/design.md), [architecture](docs/architecture.md), [local development](docs/development.md), [testing](docs/testing.md), [scope review](docs/scope-review.md), [verification results](docs/verification.md), [data licensing](docs/licensing.md).
