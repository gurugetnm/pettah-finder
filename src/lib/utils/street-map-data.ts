import locations from "@/data/street-locations.json";
import type { StreetSummary } from "@/features/discovery/repository";
import type { MapStreet } from "@/components/discovery/street-explorer";
export function streetMapData(streets: StreetSummary[]): MapStreet[] {
  return streets.map((s) => {
    const sourced = locations[s.slug as keyof typeof locations];
    const lat = s.latitude === null ? null : Number(s.latitude);
    const lon = s.longitude === null ? null : Number(s.longitude);
    const recorded =
      lat !== null &&
      lon !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lon) <= 180;
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      categories: s.categories.map(({ category }) => ({
        name: category.name,
        slug: category.slug,
      })),
      point: recorded
        ? [lat, lon]
        : sourced
          ? (sourced.point as [number, number])
          : null,
    };
  });
}
