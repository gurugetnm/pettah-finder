# Scope review — 11 October 2026

The repository began with an empty Git history. The foundation commit and in-progress implementation were preserved when the simplification request arrived.

At inspection, the working tree had Next.js App Router routes for home, search, categories, streets, street details, sitemap, robots and a read-only health endpoint. PostgreSQL 17 was running on localhost:55432, Prisma 7.10's generated client used the pg adapter, the foundation migration had been applied and the seed loaded 6 streets, 12 categories and 13 products. Type checking, linting and the original production build passed. Tests, CI and final documentation were still incomplete.

No admin dashboard, user authentication, owner accounts, user roles, community submissions, payment, AI or separate service code existed. Nothing in those areas needed deletion. `role` HTML attributes are accessibility semantics, not account permissions. Shop verification/publication enum values are editorial data flags, not user roles.

The retained architecture remains a Next.js modular monolith with PostgreSQL/Prisma and version-controlled seeds. This avoids a JSON migration or new infrastructure. Added public shop listing/detail routes, product/category/street filters and Google Maps directions links. Removed default Next.js template assets and branding. Dependencies serve actual implementation or verification functions.

Individual shops remain absent from the public development data until confirmed information and reuse permissions are available. Automated tests create clearly named fixtures exclusively in the guarded local test database, and roll back or remove them. Public code only serves published, verified shops. There are no application write APIs.
