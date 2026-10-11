# City guide redesign audit

The starting tree was clean at 08363df. Next.js 16.4 App Router uses server-rendered PostgreSQL/Prisma discovery queries, normalized product aliases, category filters, and a public directory restricted to published verified shops. No schema or visibility changes are required. The local Next.js image and lazy-loading guides were reviewed before implementation.

The existing homepage has an isolated centered headline, no photography, twelve equivalent icon cards, tiny navigation/supporting text, and text-only street cards. Search and street detail routes work, but there is no spatial discovery. Both themes, keyboard menu dismissal, skip navigation, error states, metadata, integration tests and a production Playwright/axe CI pipeline already exist and will be retained.

Direction: warm paper surfaces, readable ink, restrained terracotta actions, an image-led split hero, four featured shopping categories with compact secondary links, visual street cards, and a filterable street explorer. Authentic neighbourhood photography must be labelled as neighbourhood context unless the precise street can be established. No seeded businesses or coordinates should be presented as verified facts.
