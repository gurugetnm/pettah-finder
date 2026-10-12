import locations from "@/data/street-locations.json";
import roads from "@/data/pettah-roads.json";
import type { StreetSummary } from "@/features/discovery/repository";
import type { MapStreet } from "@/components/discovery/street-explorer";
// Regional validation prevents corrupt/global coordinates from moving the Pettah map elsewhere.
export function validPettahPoint(
  lat: number | null,
  lon: number | null,
): [number, number] | null {
  return lat !== null &&
    lon !== null &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= 6.92 &&
    lat <= 6.95 &&
    lon >= 79.84 &&
    lon <= 79.87
    ? [lat, lon]
    : null;
}
export function streetMapData(streets: StreetSummary[]): MapStreet[] {
  return streets.map((s) => {
    const source = locations[s.slug as keyof typeof locations];
    // Matching both stable slug and the independently recorded source name avoids assigning renamed/ambiguous records.
    const sourced = source?.sourceName === s.name ? source : undefined;
    const recorded = validPettahPoint(
      s.latitude === null ? null : Number(s.latitude),
      s.longitude === null ? null : Number(s.longitude),
    );
    const point =
      recorded ??
      (sourced ? validPettahPoint(sourced.point[0], sourced.point[1]) : null);
    const road =
      sourced && point
        ? roads.find(
            (r) =>
              r.id === sourced.osmWay &&
              r.name === sourced.sourceName &&
              r.points.some(
                ([lat, lon]) =>
                  lat === sourced.point[0] && lon === sourced.point[1],
              ),
          )
        : undefined;
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      categories: s.categories.map(({ category }) => ({
        name: category.name,
        slug: category.slug,
      })),
      point,
      geometry: road?.points as [number, number][] | undefined,
    };
  });
}
