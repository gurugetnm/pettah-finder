# Security decisions

Reviewed on 11 October 2026. This is a public read-only discovery application. No admin or authentication surfaces exist. The only API handler is a read-only database health check, with generic status and no-store caching. Editorial publication flags are not an authorization system.

- Queries and filters are validated with Zod. Maximum search length 80, slug length 80, duplicate URL parameters rejected, control characters rejected. NFKC and whitespace normalization apply before case-insensitive matching. Queries are bounded and results ordered.
- Prisma constructs parameterized queries. The health check uses one constant tagged query `SELECT 1`. No concatenated/raw user SQL or untrusted HTML rendering exists. React escapes displayed content.
- Database access is server-only, runtime code performs only reads, pool size and connection timeout are limited. Runtime SELECT-only credentials are recommended; local development uses a database owner for migrations/seeds. Production roles must be configured by the operator, as described in database documentation.
- Secrets belong in ignored `.env`/platform secret settings. None use a `NEXT_PUBLIC_` prefix. `.env.example` contains loopback development defaults only; CI contains a disposable service password rather than a real credential.
- Security headers deny framing/object embeds, prevent content sniffing, restrict referrer and device permissions, limit resource origins and form actions. CSP allows inline scripts/styles for Next.js hydration and next-themes initialization. Development additionally permits eval and WebSockets. This is a deliberate compatibility tradeoff, not a strict nonce CSP or a complete security guarantee. Headers were exercised on the production server.
- Google Maps links have a fixed HTTPS host, encoded destination and noopener/noreferrer. No arbitrary URL supplied by data can become a link. Search/directions do not require geolocation permission.
- Development seeds reject production/remote URLs. Tests require a local database ending `_test`, reject URL options, never fall back to development and never drop or reset databases.
- Git ignores environments, generated client, database cluster, reports and build artifacts. Stage reviews exclude all of these. CI has read-only repository permission, no deployment and no persisted Git credential.

## Dependency findings

`pnpm audit --prod` reports **no known vulnerabilities** after patched transitive overrides for lodash (4.17.24+), mysql2 (3.23.1+) and deepmerge-ts (8+). Prisma generation, migration/seed, integration tests and production build were exercised with those overrides.

The complete `pnpm audit` still reports **one high-severity development-only braces advisory**, [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), in ESLint's fast-glob/micromatch dependency chain. The advisory calls for braces 3.0.4+, but the registry currently publishes only up to 3.0.3. No unpublished version is forced into the lockfile and the finding is not hidden. It does not occur in the production-only audit. Recheck the registry and upgrade when a fix is published.

Next.js ESLint plugins currently declare peers compatible with ESLint 9, not ESLint 10. The compatible ESLint 9.39.5 version is deprecated upstream; retain it until Next's plugins support the maintained major. `pnpm peers check` passes. This maintenance limitation is explicit rather than suppressing incompatible peer checks.

Security still depends on deployment TLS, least-privileged credentials, database backups, migration review, patch updates and verifying publication data. Public substring searches are bounded but have no rate-limiter; use hosting-level request controls if needed. Never report the app as vulnerability-free based on one audit.
