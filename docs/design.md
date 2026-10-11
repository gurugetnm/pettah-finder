# Public design system

The redesign continues the existing App Router, repositories, Prisma models and routes. It addresses the illustration-heavy homepage, competing banners, inconsistent card treatments and category-first results by putting product search and street discovery first.

## Visual language

| Token          | Light     | Dark      |
| -------------- | --------- | --------- |
| Background     | `#fcfaf7` | `#1b1b18` |
| Text           | `#292722` | `#f3eee5` |
| Accent         | `#a83e1b` | `#f0a578` |
| Secondary text | `#706a60` | `#b9b1a4` |
| Card           | `#fffdf9` | `#22221e` |
| Border         | `#e7e0d6` | `#39372f` |

Shared tokens live in `src/app/globals.css` and are exposed to Tailwind. Major spacing follows an 8px scale; compact typography and icon gaps use smaller optical adjustments. Cards use 12px corners, controls 8px, subtle borders and restrained hover/focus states. No gradients or decorative image downloads are needed.

Plus Jakarta Sans supplies headings and DM Sans supplies body text. Two Latin variable WOFF2 assets are served by Next locally with font swapping and fallback metrics. Fontsource packages are locked with the application; both fonts use SIL OFL 1.1 with public license notices. Adding another language requires appropriate font subsets and reviewed translations.

## Page hierarchy

- Home: local identity, confident headline, product search, compact suggestions, category grid, three featured streets, three practical discovery steps and minimal footer.
- Search: query heading and the shared form, matching streets first, associated categories, available public shops and useful empty/invalid-query feedback.
- Directories: consistent headings, shared cards and shareable native GET filters. No unnecessary filter controls appear on search.
- Street/shop detail: breadcrumbs, clear identity and prominent Maps action, followed by factual categories, related products and shop/location information. Missing business data remains explicitly unavailable.
- Feedback: matching loading, empty, error and missing-page surfaces preserve the same tokens and type scale.

Header navigation stays minimal on desktop; mobile exposes search, streets, categories and shops. Light/dark/system choices are in a compact keyboard-accessible disclosure. Escape restores focus to its trigger. Native GET forms and normal links retain the existing URL behaviour.

## Mobile and accessibility

Layout gutters shrink from 32px to 24px and then 16px at narrow widths. Category tiles move from six columns to four, three and two; street cards move from three to two to one. Search inputs use 16px text and comfortable controls; native filters wrap vertically. Detail directions appear before long content on mobile. Sticky navigation includes top safe-area padding, and the footer respects the bottom safe area.

Focus rings, semantic landmarks, a working skip link, descriptive outbound Maps labels and reduced-motion preferences are shared across pages. Playwright asserts no horizontal overflow at seven widths from 320px to 1440px; isolated shop fixtures additionally cover narrow/detail layouts. Axe checks exercise both themes across public pages, including shop fixtures and empty/404 states. These automated checks complement visual review and do not constitute comprehensive accessibility certification.

See [testing](testing.md) and [actual verification results](verification.md).
