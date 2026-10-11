import roads from "@/data/pettah-roads.json";
import locations from "@/data/street-locations.json";
export function StreetVisual({ slug, name }: { slug: string; name: string }) {
  const location = locations[slug as keyof typeof locations];
  return (
    <div
      className="street-visual"
      aria-label={
        location
          ? `OpenStreetMap street illustration for ${name}`
          : `Street photograph for ${name} pending`
      }
      role="img"
    >
      {location ? (
        <svg viewBox="0 0 400 160" aria-hidden="true">
          {roads.map((road) => (
            <polyline
              key={road.id}
              points={road.points
                .map(
                  ([lat, lon]) =>
                    `${200 + (lon - location.point[1]) * 75000},${80 - (lat - location.point[0]) * 75000}`,
                )
                .join(" ")}
              fill="none"
              stroke={
                road.name === location.sourceName
                  ? "var(--primary)"
                  : "var(--map-road)"
              }
              strokeWidth={road.name === location.sourceName ? 7 : 3}
              strokeLinecap="round"
            />
          ))}
          <circle
            cx="200"
            cy="80"
            r="13"
            fill="var(--primary)"
            stroke="var(--card)"
            strokeWidth="4"
          />
          <circle cx="200" cy="80" r="3" fill="var(--card)" />
        </svg>
      ) : (
        <MapPlaceholder />
      )}
      <span className="street-visual-label">
        {location ? "Street at a glance" : "Street photography coming soon"}
      </span>
    </div>
  );
}
function MapPlaceholder() {
  return <span className="visual-placeholder">Pettah · Colombo</span>;
}
