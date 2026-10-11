"use client";
import { useEffect } from "react";
import { MapContainer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import roads from "@/data/pettah-roads.json";
import type { MapStreet } from "./street-explorer";
import { directionsUrl } from "@/lib/utils/maps";
import "leaflet/dist/leaflet.css";
const markerIcon = (active: boolean) =>
  divIcon({
    className: "street-pin-wrapper",
    html: `<span class="street-pin${active ? " selected" : ""}" aria-hidden="true">↗</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
function View({
  streets,
  selected,
}: {
  streets: MapStreet[];
  selected?: string;
}) {
  const map = useMap();
  useEffect(() => {
    const points = streets.flatMap((s) => (s.point ? [s.point] : []));
    if (points.length)
      map.fitBounds(latLngBounds(points).pad(0.35), {
        maxZoom: 17,
        animate: false,
      });
  }, [map, streets]);
  useEffect(() => {
    const street = streets.find((s) => s.slug === selected);
    if (street?.point) map.panTo(street.point, { animate: false });
  }, [map, selected, streets]);
  return null;
}
export default function StreetMap({
  streets,
  selected,
  onSelect,
}: {
  streets: MapStreet[];
  selected?: string;
  onSelect: (slug: string) => void;
}) {
  const selectedName = streets.find((s) => s.slug === selected)?.name;
  return (
    <div
      className="map-canvas"
      aria-label="Interactive map of Pettah shopping streets"
    >
      <MapContainer
        center={[6.9371978, 79.8519364]}
        zoom={16}
        scrollWheelZoom={false}
        dragging={!globalThis.matchMedia?.("(pointer: coarse)").matches}
        attributionControl={false}
        className="leaflet-street-map"
      >
        <View streets={streets} selected={selected} />
        {roads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.points as [number, number][]}
            pathOptions={{
              color: road.name === selectedName ? "#b34220" : "#c2bcae",
              weight: road.name === selectedName ? 6 : 3,
              opacity: 1,
            }}
          />
        ))}
        {streets
          .filter((s) => s.point)
          .map((s) => (
            <Marker
              key={s.slug}
              position={s.point!}
              icon={markerIcon(s.slug === selected)}
              title={s.name}
              alt={`Select ${s.name}`}
              eventHandlers={{ click: () => onSelect(s.slug) }}
            >
              <Popup>
                <strong>{s.name}</strong>
                <p>{s.categories.map((c) => c.name).join(" · ")}</p>
                <a href={`/streets/${s.slug}`}>Explore street →</a>
                <br />
                <a
                  href={directionsUrl(s.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Maps directions ↗
                </a>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
      <span className="map-orientation" aria-hidden="true">
        N ↑
      </span>
      {!streets.some((s) => s.point) && (
        <p className="map-no-points" role="status">
          Precise locations are not available for these streets. Use the street
          guides and name-based directions.
        </p>
      )}
    </div>
  );
}
