# Data permission requests

Reviewed 12 October 2026. Neither directory grants a reuse license. robots.txt allows crawling on both, but that only signals crawler access. It is not permission to republish. Until a written reply grants permission, both stay `PERMISSION_REQUIRED` in `data/manifests/sources.json` and no adapter exists.

When permission arrives: save the reply (or a reference to it) in `permissionEvidence`, set `license`, `attribution`, `allowedFields`, `publicationPermitted`, and set `permissionStatus: "APPROVED"`. Set `automatedCollection: true` only if they allow automated access. Prefer an export file (`pnpm data:import:file`) over crawling.

| Source                                             | Finding                                                                                                                     | Contact                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| peta.lk (1xtec)                                    | [Terms](https://peta.lk/terms) §5: content may not be copied, reproduced or used without written permission. No API/export. | support@peta.lk, +94 71 150 0104                                |
| pettahhub.lk (SLT Digital Services / Rainbowpages) | "All rights reserved"; no terms of use, API or export found.                                                                | [Contact form](https://pettahhub.lk/contactus), +94 11 239 9399 |

## Draft: peta.lk

> **Subject:** Permission to reuse Pettah shop listings — Pettah Finder
>
> Hello peta.lk team,
>
> I run Pettah Finder (https://github.com/gurugetnm/pettah-finder), a free, non-commercial guide that helps visitors find which Pettah streets and shops sell particular products.
>
> Your terms say content may not be reused without written permission, so I'm asking before using any of it. Would you allow us to use basic details of Pettah / Colombo Market shops: shop name, street, category and public business phone?
>
> - We would credit peta.lk on every listing, with a link back to the shop's page on your site.
> - We'd prefer an export file or API rather than crawling your site. If crawling is the only option, we'd do it slowly and on a schedule you set.
> - We would not copy photos, descriptions, prices or classified ads.
> - We would remove any data on request.
>
> Please let me know what's acceptable, along with any attribution wording you'd like.
>
> Thank you,
> Thevindu Guruge

## Draft: Pettah Hub (SLT Rainbowpages)

> **Subject:** Data licensing request for Pettah supplier listings — Pettah Finder
>
> Hello Pettah Hub / SLT Digital Services team,
>
> I'm building Pettah Finder (https://github.com/gurugetnm/pettah-finder), a free guide that helps shoppers find the right street and shop in Pettah. Pettah Hub has the most complete supplier directory for the area.
>
> Would SLT Digital Services consider licensing or permitting use of basic listing details: business name, street or address, trade category and public business phone?
>
> - We would credit Pettah Hub / Rainbowpages on each listing, with a link back to your page.
> - We'd prefer a data export or API. We would not crawl your site without your agreement.
> - We would not copy descriptions, logos or advertisements.
> - We would honour removal requests.
>
> If a licensing fee or partnership applies, I'd be glad to discuss it.
>
> Kind regards,
> Thevindu Guruge
