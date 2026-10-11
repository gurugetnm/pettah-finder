# Local development

Use Node 24 and the pinned pnpm version. Install with the frozen lockfile. Copy `.env.example` to the ignored `.env`; Prisma CLI and Next.js both load it, while test scripts explicitly load dotenv. Do not assume `.env.local` is automatically loaded by Prisma CLI.

`pnpm db:local` starts a project-local PostgreSQL cluster on port 55432, initializes only if absent and creates separate development/test databases if missing. It never drops/reset data. PostgreSQL binaries must be on PATH. The local server binds exclusively to 127.0.0.1; trust authentication is appropriate only for this isolated developer setup. `pnpm db:local:stop` stops the cluster without deleting it. If that port is occupied by another cluster, the script fails instead of changing it.

Run `pnpm db:generate`, `pnpm db:deploy`, `pnpm db:seed`, then `pnpm dev`. The homepage reads actual PostgreSQL data; database failures show a generic error with a retry button. Shop directories remain empty until verified data exists. No application file-based fallback conceals a missing database.

Use `pnpm db:migrate --name meaningful_name` for schema changes, review the generated SQL and commit it. Development seeds live in `prisma/seed-data.ts`. Changing a product/category association should include integration expectations and provenance documentation. Seeds do not delete records; an intentional removal needs a separate reviewed data change.

Quality checks are `pnpm check`, `pnpm test:integration`, `pnpm build`, `pnpm test:e2e`. Browser installation is required once: `pnpm exec playwright install chromium` (Linux may need `--with-deps`). E2E launches a production server against the test database at :3100 and will not reuse an unrelated server. Test reports, visual review screenshots, generated client and local cluster files are ignored.

## Troubleshooting

- Prisma missing client: run `pnpm db:generate`.
- Connection refused: start PostgreSQL; verify server-only `.env` URLs match the chosen ports/databases.
- Migration permissions: use the schema-owner URL for migrations, a read-only role for production runtime.
- Missing PostgreSQL binaries on macOS: install `postgresql@17` and add its bin directory to PATH. Do not initialize into an existing system cluster.
- Seed rejected: it intentionally only accepts local `pettah_dev`/`pettah_test` outside production. Do not bypass it to seed production.
- Integration refused: provide a separate local URL ending `_test`, without URL options, and a development URL pointing elsewhere.
- Playwright loader: fixtures use parameterized pg queries solely in the isolated test database; public query logic remains Prisma-backed.
