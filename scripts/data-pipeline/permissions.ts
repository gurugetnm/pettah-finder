import type { Source } from "./schema";

/** Why a source may not be collected automatically, or null when it may. */
export function collectionBlocker(source: Source | undefined): string | null {
  if (!source) return "source is not listed in data/manifests/sources.json";
  if (source.permissionStatus !== "APPROVED")
    return `permission status is ${source.permissionStatus}`;
  if (!source.automatedCollection)
    return "automated collection is not permitted for this source";
  return null;
}

/** Why records from a source may not be published, or null when they may. */
export function publicationBlocker(source: Source | undefined): string | null {
  if (!source) return "source is not listed in data/manifests/sources.json";
  if (source.permissionStatus !== "APPROVED")
    return `permission status is ${source.permissionStatus}`;
  if (!source.license.trim()) return "source has no license recorded";
  if (!source.publicationPermitted) return "source does not permit publication";
  if (!source.attribution.trim()) return "source has no attribution text";
  return null;
}
