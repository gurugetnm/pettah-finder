# Verification — 11 October 2026

Executed locally on Node 24.18.0, pnpm 11.22.0 and PostgreSQL 17. The implementation was continued in place, preserving Git history and working PostgreSQL configuration.

| Command/check                                    | Actual result                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                 | Passed; lockfile reproducible                                                                                                                                                                 |
| `pnpm db:local`                                  | Passed with existing project-local cluster; no reset                                                                                                                                          |
| `pnpm db:generate`                               | Passed, Prisma 7.10 generated client                                                                                                                                                          |
| `pnpm db:deploy` / migration development command | Foundation migration created/applied locally; deployment applied to separate test database                                                                                                    |
| `pnpm db:seed` (twice)                           | Passed; integration also asserts stable row counts and no shops/coordinates                                                                                                                   |
| `pnpm check`                                     | Passed: formatting, ESLint, strict type checking, 22 unit/component tests                                                                                                                     |
| `pnpm test:integration`                          | Passed: 7 tests against guarded local `pettah_test`                                                                                                                                           |
| `pnpm build`                                     | Passed; all public routes generated/compiled                                                                                                                                                  |
| `pnpm test:e2e`                                  | Passed: 9 Chromium scenarios against production server and dedicated test database                                                                                                            |
| `pnpm peers check`                               | Passed; compatible dependency peer versions                                                                                                                                                   |
| `pnpm audit --prod`                              | Passed: no known production dependency vulnerabilities                                                                                                                                        |
| Full `pnpm audit`                                | One high-severity development-only `braces` finding; patched registry release unavailable; documented in security guide                                                                       |
| Secret-pattern/Git ignore review                 | No token/private-key patterns found in tracked or candidate files. Environment and local cluster ignored                                                                                      |
| Visual inspection                                | Home/search/street screenshots reviewed at 1440px light and 390px light/dark; isolated shop detail reviewed on mobile                                                                         |
| Responsive assertions                            | No horizontal overflow across 320/375/390/430/768/1024/1440px on home, categories, streets, street detail, search and shop directory; isolated shop detail also checked at 320/390/768/1440px |
| Route checks                                     | Home/search/categories/street directory/detail/shop directory/detail, sitemap, robots and health exercised. Missing streets/shops and unknown/admin/login routes return HTTP 404              |
| Accessibility checks                             | Axe WCAG A/AA rules and best-practice checks passed on public pages in light/dark, including shop fixtures, empty/404 states; keyboard skip link/Escape focus checks passed                   |
| Scope scan                                       | No admin/authentication routes, roles, login/register components, unsafe raw query methods or client-side database imports                                                                    |

Public shop details/search/filters are verified using clearly isolated TEST FIXTURE shops in the test database. Draft and unverified shops stay hidden and out of the sitemap; fixtures are removed after browser tests. The development/public dataset contains zero individual business listings, as required pending real verified data.

The first browser run caught duplicate directions markup and a streaming HTTP status problem for missing detail slugs. Both were corrected and the full browser suite passed afterward. Unit tests include the required matchMedia environment support. These are resolved issues, not ignored failures.

The frontend redesign introduces shared warm light/dark tokens, locally served DM Sans/Plus Jakarta Sans, search-led home content, street-first results and prominent detail directions. Existing repositories, PostgreSQL schema, routes and search behaviour are preserved. Font license notices are included.

Non-failing tool notices remain: Playwright reports NO_COLOR/FORCE_COLOR precedence; the Prisma/pg adapter emits a deprecation warning about concurrent queries inside integration transactions, relevant to a future pg 9 upgrade. Current pg 8 tests pass. Next ESLint peer compatibility requires deprecated ESLint 9 until plugins support ESLint 10. No comprehensive accessibility certification, production load benchmark or remote CI run is claimed.

GitHub Actions workflow is committed with PostgreSQL, browser provisioning and quality gates. No code was pushed, no deployment was performed, and no external issues, milestones or pull requests were created during the revised scope implementation.

Remaining work: collect permissioned, independently verified shop data; configure production database runtime permissions/TLS and the real site origin; address the development dependency advisory when a patched package exists. The implemented public browsing flow has no infrastructure blocker locally.

## City guide redesign verification — 12 October 2026

This later redesign supersedes the earlier frontend design description above. Full implementation, source provenance, limitations and incremental commit record are in [redesign-report.md](redesign-report.md).

Verified: 22 unit tests, 7 PostgreSQL integration tests, 11 production Chromium scenarios, ESLint, TypeScript, Prettier, production build and production dependency audit (no known vulnerabilities). Responsive assertions now also include 360px. Both themes and loaded mobile Leaflet map pass axe checks; geographic pin overlap caught during mobile testing was corrected. No destructive database changes, schema changes, imported shops or remote deployment occurred.

## Data pipeline verification — 12 October 2026

Additive migration `shop_source_provenance` applied to local `pettah_dev` and `pettah_test` (no reset, no existing rows changed). `pnpm check` passed (formatting, ESLint, TypeScript, 56 unit/pipeline tests). `pnpm test:integration` passed (18 tests, 11 for publication safety). `pnpm build` passed. `pnpm test:e2e` passed (11 Chromium scenarios).

Live pilot: one bounded Overpass query returned 33 `shop=*` elements (27 named, 6 unnamed, 0 malformed, 0 out of area, 0 duplicate suggestions; 19 unmapped shop types and 21 without a matched street sent to review). Dry-run publication: 27 skipped as awaiting review. **No records were reviewed, verified or written to any database.** Live candidates stay only in git-ignored `.local/`. The e2e fixtures have no `ShopSource` rows, so the attribution line on shop pages was type-checked and built but not visually exercised.

## Real tile-map verification — 12 October 2026

The manual activation screen/local line-only map is replaced by viewport-loaded raster tiles. Live desktop and mobile checks received 12 and 6 successful HTTP 200 PNG tile responses respectively, with no page errors and visible geographical context. All 14 production browser scenarios, 18 database integration tests, lint, type checks, formatting and build pass. Unit/data-pipeline tests pass, including source matching, missing/invalid coordinates, tile provider configuration and selection. Repeated browser interaction tests intercept tile requests with synthetic fixtures to avoid automated public-server loading. Current provider configuration, exact node/way provenance, pending production key and limitations are in [map-implementation.md](map-implementation.md).
