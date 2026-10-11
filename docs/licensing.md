# Data licensing and attribution

This is an engineering record, not legal advice. Automated checks in the pipeline only enforce what the manifest says. They don't make a legal determination.

## OpenStreetMap (ODbL 1.0)

- **Attribution.** OSM-derived shop pages show "Listing data © OpenStreetMap contributors" with a link to <https://www.openstreetmap.org/copyright> and the original OSM object. `/image-credits` explains the shop listings, and the footer links there. Attribution is required even where no map is shown.
- **What we store.** Each imported shop keeps a `ShopSource` row: source, OSM element type/id, URL, license, attribution, Overpass dataset timestamp, location precision, raw tags and change history. OSM-derived records therefore stay distinguishable from project-authored data.
- **Derivative vs collective database.** Imported OSM shop facts, after normalization and review, are an ODbL **derivative database**. They're stored in `Shop`/`ShopSource` rows alongside project-authored streets, categories and products. We treat the street/category/product vocabulary as a separate, independent database combined into a **collective database**. That position relies on the OSMF community guidelines and has not been confirmed by a lawyer. Until it is, don't apply a proprietary license to the combined shop data.
- **Share-alike.** If the public site counts as "publicly using" a Produced Work from the derivative database, ODbL §4.6 requires us to offer the derivative database (or the changes/method) under ODbL on request. Documented method: export the OSM-derived rows (shops joined to `ShopSource` where `source = 'osm'`, with their fields and categories) to CSV/JSON and provide it under ODbL with the attribution above. Alternatively, publish this repository's pipeline code plus the reviewed `decisions.json`, which together reproduce the derivative from public OSM data. Nobody has requested this yet. Choosing and stating the primary offer method is an **open publication blocker** to settle before the first real OSM-derived listing goes live.
- **Usage policy.** Overpass is used for one small, cached, sequential, identified query per manual run. Public Nominatim, the OSM editing API and openstreetmap.org HTML are not used.

## Other sources

`data/manifests/sources.json` is authoritative. A source may be collected automatically only when it is `APPROVED` with `automatedCollection: true`. Its records may be published only when it is `APPROVED` with license, evidence, attribution and `publicationPermitted: true`. Directory sites stay `PERMISSION_REQUIRED` until a person has reviewed their terms, robots rules, database rights and republication permission and recorded the evidence. Robots.txt is an access signal, not a license.

## Open questions (blockers before real publication)

1. Confirm the ODbL derivative/collective treatment described above.
2. Pick and document the primary share-alike offer method (export on request vs. published code + decisions).
3. For any shop-owner-supplied records: record written consent and what may be republished.
