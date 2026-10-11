# Database

Prisma 7.10 uses `prisma.config.ts` for the CLI connection URL and the generated `prisma-client` plus `@prisma/adapter-pg` at runtime. `src/generated/prisma` is ignored; generate it after installation. PostgreSQL 17 is used locally and in CI.

Street ↔ Category uses StreetCategory. A Product has one Category in this small MVP and many ProductAlias rows. Shops belong to a Street and connect to categories/products through ShopCategory/ShopProduct. Latitude/longitude are nullable Decimal values. Shop verification and publication are independent editorial states. They do not represent accounts or permissions.

Every slug is unique; foreign keys enforce relationships. Foreign-key lookup columns and frequently searched names/aliases have indexes. Substring ILIKE queries do not gain general acceleration from these B-tree indexes; add a measured PostgreSQL trigram approach only if growth warrants it. Results are explicitly ordered with a unique ID tie-breaker and bounded.

Deleting a Street with shops is restricted. Categories/products linked to dependent records are restricted. Dependent join rows and product aliases may cascade when their parent is deliberately removed. Migrations are reviewed SQL under `prisma/migrations`. Use `pnpm db:migrate --name description` for a local schema change, and `pnpm db:deploy` to apply already committed migrations. Never reset production.

`pnpm db:seed` performs transactional upserts with stable IDs and resolves foreign keys using stored slugs. Repeated execution does not duplicate or remove records; it updates maintained fields and adds missing associations. Removing a seed relation from a file does not delete an existing relation: perform an explicit reviewed data migration for removals. Shop data and coordinates are untouched. Seeds reject production mode, remote hosts and unexpected database names.

## Maintaining real shop data

Use the reviewed CLI pipeline in [data-pipeline.md](data-pipeline.md) for imported shops. `ShopSource` stores provenance per (source, sourceRecordId); deleting a shop cascades its source rows.

Record the source, reuse permission, verification date and business consent where needed before loading any shop. Use a reviewed, version-controlled script and existing Prisma models; never create an admin workflow. New shops default to UNVERIFIED/DRAFT and cannot appear publicly. A confirmed listing must deliberately set VERIFIED, PUBLISHED and `lastVerifiedAt`. Populate categories/products using foreign-key IDs, and leave unknown values null. Coordinate data needs licensed provenance. Do not import data from a private test database into the public dataset.

Production should use a SELECT-only runtime role separate from the schema owner. For example, an operator can grant CONNECT on the database, USAGE on the public schema and SELECT on Street, Category, Product, ProductAlias, StreetCategory, Shop, ShopCategory and ShopProduct to a dedicated role. Grant default SELECT privileges for future tables if desired. Supply that role's URL as `DATABASE_URL` for the web process; supply the schema-owner URL only in the controlled migration job. Use TLS as required by the database provider; do not disable certificate validation.
