# Data collection pipeline

A local, manually run CLI that turns permitted source data into reviewed shop listings in the existing PostgreSQL/Prisma database. There is no admin UI, no background scraping, and nothing runs during web requests, builds or CI.

```
sources.json permission check → fetch / import → raw storage (.local/)
  → normalize → validate (quarantine) → geographic check → duplicate detection
  → CLI review (data/review/decisions.json) → dry-run plan → explicit --apply
  → Shop + ShopSource rows → public pages (VERIFIED + PUBLISHED only)
```

Code: `scripts/data-pipeline/`. Config: `data/manifests/` (sources, boundary), `data/mappings/` (categories, street aliases). Review decisions: `data/review/decisions.json` (committed). Raw downloads, candidates, reports and publish backups live in the git-ignored `.local/data-pipeline/` because they can contain business contact details.

## Normal workflow

```bash
pnpm data:check-sources
```

```bash
DATA_PIPELINE_CONTACT="https://github.com/<owner>/pettah-finder" pnpm data:fetch:osm
```

```bash
pnpm data:process
```

```bash
pnpm data:review list --filter pending
```

```bash
pnpm data:review approve osm:node/123 --reviewer "Name" --street sea-street --categories jewellery --notes "Checked signboard"
```

```bash
pnpm data:publish:dry
```

```bash
pnpm data:publish
```

## Commands

| Command              | Arguments                                                                                                                                                                                     | What it does                                                                                                                                                                                                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data:check-sources` | —                                                                                                                                                                                             | Validates manifests, boundary, category mapping and decisions; prints each source's collection/publication status. Exits 1 on invalid config.                                                                                                                                                                                                              |
| `data:fetch:osm`     | `--file <path.json>` local Overpass-JSON extract/fixture; or live with `DATA_PIPELINE_CONTACT` set; `--endpoint <url>` (must be in the manifest allowlist); `--refresh` bypass the 24 h cache | One bounded Overpass query (`nwr["shop"]` in the bbox, `out tags center`, 25 s server timeout, 16 MB maxsize, 5000 element cap). Stores raw response under `.local/data-pipeline/raw/osm/`.                                                                                                                                                                |
| `data:import:file`   | `--source <id> --file <path.csv\|.json>`                                                                                                                                                      | Imports a licensed file for a `type: "file"` source. Path must be inside the repo, ≤ 5 MB, ≤ 20 000 rows. Only manifest `allowedFields` are kept. Columns: `id` (required), `name`, `street`, `address`, `latitude`, `longitude`, `location_precision`, `phone`, `website`, `opening_hours`, `categories` (category slugs separated by `;`), `source_url`. |
| `data:process`       | —                                                                                                                                                                                             | Normalizes, validates, checks the boundary and detects duplicates for the latest raw file of each source. Writes `candidates.json`, `report.md`, `review-export.csv`.                                                                                                                                                                                      |
| `data:review`        | `list [--filter pending\|approved\|rejected\|duplicates\|unknown-category\|out-of-area\|unassigned\|all]`, `invalid`, `duplicates`, `show <id>`, `approve <id>`, `reject <id>`                | Review options: `--reviewer` (or `DATA_REVIEWER`), `--street <slug>`, `--categories a,b`, `--distinct` (resolves a duplicate suggestion), `--verified --evidence "<what was checked>"`, `--notes`.                                                                                                                                                         |
| `data:report`        | —                                                                                                                                                                                             | Regenerates the markdown report and formula-safe CSV export with current decisions.                                                                                                                                                                                                                                                                        |
| `data:publish:dry`   | —                                                                                                                                                                                             | Prints proposed inserts, updates, conflicts, refusals and skips. Reads only.                                                                                                                                                                                                                                                                               |
| `data:publish`       | `--confirm-host <host>` for non-local DBs; `--rollback <backup.json>`                                                                                                                         | Applies the plan in one transaction after writing a backup to `.local/data-pipeline/publish-backups/`.                                                                                                                                                                                                                                                     |

## Statuses

Each stage is tracked separately and none implies the next:

| Stage                    | Where                                                              |
| ------------------------ | ------------------------------------------------------------------ |
| Parsed                   | record is in `candidates.json` (else `quarantine` or `unnamed`)    |
| Geographically plausible | no `out_of_area` flag; coordinates inside the boundary             |
| Manually reviewed        | a decision exists in `decisions.json`                              |
| Independently verified   | decision has `independentlyVerified: true` and `evidence`          |
| Approved for publication | decision `approved` and `data:publish:dry` shows `insert`/`update` |

Coming from OSM is **not** verification. Approved but unverified records are written as `UNVERIFIED`/`DRAFT` and stay hidden. Only approved and independently verified records become `VERIFIED`/`PUBLISHED`, with `lastVerifiedAt` set to the review time.

## Geographic boundary

`data/manifests/boundary.json` holds an **approximate** bbox: south 6.932, west 79.847, north 6.943, east 79.861. It's the same box as the project's existing OSM road snapshot, and it was checked manually to contain all six mapped shopping streets. It is not an authoritative Pettah boundary (`authoritative: false`), and it has no safety margin. Records outside it are flagged `out_of_area` and can never be published. The schema rejects boxes larger than about 5 km per side, so the query can't be silently widened to all of Colombo. If you adopt a verified boundary later, update the file, its `source` and `validatedAt`.

## Normalization rules

- **Names:** NFC, control characters stripped, whitespace collapsed. Punctuation, case and non-Latin scripts are kept for display. A separate NFKC lower-case key is used only for comparison. Unnamed features are counted, never named, never published.
- **Streets:** only exact matches against documented spellings in `street-aliases.json` (for example First Cross Street ↔ 1st Cross Street). Anything else is `street_unmatched` and needs `--street` in review. Shops are never attached to the nearest street.
- **Phones:** `+94`/`0094` + 9 digits, or national `0` + 9 digits, become `+94XXXXXXXXX`. Anything else is flagged `phone_unrecognized` and dropped from the normalized field. The original value is kept in `contactPhoneRaw`. A valid format is not proof of ownership.
- **Coordinates:** an OSM node is `exact` (a mapped point, not a surveyed entrance). A way/relation centre is `representative`. Only `exact` points are written to `Shop.latitude/longitude`. Precision is always stored on `ShopSource`.
- **Categories:** `data/mappings/categories.json` maps `shop=*` values to existing category slugs. Unmapped values are flagged `category_unknown` and need `--categories` in review. Products are never inferred.

## Duplicate detection

Exact source identity (`source` + OSM `type/id`) is idempotent within a run (`exactDuplicates`) and across runs (the `ShopSource` unique key). Possible duplicates use an additive score; every pair report lists its reasons:

| Signal                                                    | Points             |
| --------------------------------------------------------- | ------------------ |
| same normalized name / similar name (token Jaccard ≥ 0.6) | +0.4 / +0.2        |
| same phone / both present but different                   | +0.3 / −0.1        |
| same website                                              | +0.2               |
| ≤ 20 m / ≤ 60 m / > 200 m apart                           | +0.2 / +0.1 / −0.3 |
| same street / different known streets                     | +0.1 / −0.2        |

A score of 0.7 or more is a `probable_duplicate`, and 0.4 or more is `ambiguous`. Both flag the records `possible_duplicate`, which blocks publication until a reviewer rejects one record or passes `--distinct`. Nothing is merged automatically. No single signal can reach the probable threshold alone, and same-name branches on different streets score as distinct. At publish time, a new record whose name and street match an existing shop that has no source link is reported as a conflict.

## Publishing safety

- Dry-run by default. `data:publish` (`--apply`) refuses to run when `CI` is set. A non-local or `NODE_ENV=production` database needs `DATA_PUBLISH_ALLOW_REMOTE=yes` and `--confirm-host <exact hostname>`. Use a write-capable role here, not the web app's SELECT-only role (see [database.md](database.md)).
- Refused: sources that aren't `APPROVED` with a license, attribution and `publicationPermitted`; unreviewed or rejected records; `out_of_area`; no street; unmapped categories; unresolved duplicates; unknown street/category slugs; slug collisions.
- Existing `VERIFIED` shops are never overwritten. Differences are reported as conflicts for manual editing. Updates to unverified drafts never erase a field the new data lacks. Shops without a `ShopSource` link (manually maintained) are never touched.
- At most 500 changes per run, applied in a single transaction: a failure rolls back the whole batch. Nothing is ever deleted.
- Every write appends a `history` entry (time, action, changed fields, reviewer, notes, dataset version) to `ShopSource`.

## Rollback

Each apply writes `.local/data-pipeline/publish-backups/<timestamp>.json` before writing to the database, then marks it `applied`.

```bash
pnpm data:publish --rollback 2026-10-12T10-00-00-000Z.json
```

This restores the previous fields and categories of updated shops, and withdraws inserted shops to `DRAFT`. It doesn't delete them, so their provenance survives. Keep backups until a release is confirmed. For a full restore, use a normal PostgreSQL backup taken before the run.

## Adding a licensed source

1. Add an entry to `data/manifests/sources.json`: `type: "file"` (or a new adapter type), license, permission evidence (where the permission is written down, and by whom), attribution, `allowedFields`, `publicationPermitted`, `reviewedAt`.
2. Leave `permissionStatus: "PERMISSION_REQUIRED"` until a person has checked the terms, database rights and republication permission. Being publicly downloadable is not a license.
3. `pnpm data:check-sources` must pass. `APPROVED` entries without license, evidence or attribution are rejected.
4. Update the source inventory in [data-sources.md](data-sources.md) and attribution in the UI if needed.

Directory websites (peta.lk, pettahhub.lk) have no adapter. Don't write one until their entry is `APPROVED` with recorded evidence. Never bypass CAPTCHAs, logins, rate limits or robots rules.

## Tests

```bash
pnpm test
```

```bash
pnpm test:integration
```

`tests/data-pipeline/` covers OSM parsing, the fetch policy (allowlist, User-Agent, Retry-After, retry cap, size and time limits), normalization, duplicate scoring, licensing gates, CSV import, path/formula safety, review persistence and production guards. These tests make no network requests. `tests/integration/publish.test.ts` runs against the guarded local `_test` database: dry-run doesn't mutate, publishing works, rejected/unreviewed records are skipped, drafts stay hidden, reruns are idempotent, verified data is protected, a failed batch rolls back, and rollback works.

## Troubleshooting

- `Set DATA_PIPELINE_CONTACT`: live Overpass requests must identify the operator.
- `Overpass responded 429/504`: the pipeline retries at most twice and honours `Retry-After` up to 2 minutes. Try later or use `--file` with an extract. Never rotate endpoints to get around limits.
- `No raw data`: run a fetch/import first. `process` uses the newest raw file per source.
- `refused … unmapped category` or `no street association`: re-run `data:review approve` with `--categories` or `--street`.
- `conflict … verified shop differs`: edit the verified shop deliberately in a reviewed script. The importer won't.

## Known limitations

- The study area is an approximate bbox, not an authoritative boundary.
- Only `shop=*` features are queried. Other commercial POIs (`craft`, `amenity=marketplace`) aren't, yet.
- Street association relies on `addr:street`. In the 11 Oct 2026 pilot, most Pettah shops in OSM lack it (21 of 27 unassigned), so most need a reviewer-supplied street.
- Website and opening hours are kept in candidates and provenance but have no `Shop` column or UI yet.
- Duplicate checks run within a batch plus a name/street check against existing shops. They don't run across all historical sources.
