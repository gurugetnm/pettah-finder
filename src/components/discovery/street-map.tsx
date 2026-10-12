"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from "react-leaflet";
import {
  divIcon,
  latLngBounds,
  type TileLayer as LeafletTileLayer,
} from "leaflet";
import type { MapStreet } from "./street-explorer";
import type { TileConfiguration } from "@/lib/maps/tile-provider";
import { directionsUrl } from "@/lib/utils/maps";
import "leaflet/dist/leaflet.css";
const icons = [false, true].map((active) =>
  divIcon({
    className: "street-pin-wrapper",
    html: `<span class="street-pin${active ? " selected" : ""}" aria-hidden="true">↗</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  }),
);
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
      map.fitBounds(latLngBounds(points).pad(0.25), {
        maxZoom: 17,
        animate: false,
      });
    if (window.matchMedia("(max-width: 767px)").matches)
      map.setZoom(Math.max(map.getZoom(), 18), { animate: false });
  }, [map, streets]);
  useEffect(() => {
    const street = streets.find((s) => s.slug === selected);
    if (street?.point)
      map.setView(street.point, Math.max(map.getZoom(), 17), {
        animate: false,
      });
  }, [map, selected, streets]);
  useEffect(() => {
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return null;
}
function GeographicTiles({
  config,
}: {
  config: Exclude<TileConfiguration, { provider: "unconfigured" }>;
}) {
  const layer = useRef<LeafletTileLayer>(null);
  const [status, setStatus] = useState({ pending: true, loaded: 0, failed: 0 });
  const eventHandlers = useMemo(
    () => ({
      loading: () => setStatus({ pending: true, loaded: 0, failed: 0 }),
      tileload: () => setStatus((s) => ({ ...s, loaded: s.loaded + 1 })),
      tileerror: () => setStatus((s) => ({ ...s, failed: s.failed + 1 })),
      load: () => setStatus((s) => ({ ...s, pending: false })),
    }),
    [],
  );
  return (
    <>
      <TileLayer
        ref={layer}
        url={config.url}
        attribution={config.attribution}
        maxZoom={config.maxZoom}
        keepBuffer={0}
        updateWhenIdle
        eventHandlers={eventHandlers}
      />
      {(status.pending || status.failed > 0) && (
        <div className="map-tile-status" role="status">
          <p>
            {status.failed
              ? status.loaded
                ? "Some map tiles could not load. Street selection and directions are still available."
                : "Map tiles could not load. Check your connection or use the street directions."
              : "Loading map tiles…"}
          </p>
          {status.failed > 0 && (
            <button type="button" onClick={() => layer.current?.redraw()}>
              Retry map tiles
            </button>
          )}
        </div>
      )}
    </>
  );
}
export default function StreetMap({
  streets,
  selected,
  onSelect,
  tiles,
}: {
  streets: MapStreet[];
  selected?: string;
  onSelect: (slug: string) => void;
  tiles: TileConfiguration;
}) {
  const active = streets.find((s) => s.slug === selected);
  if (tiles.provider === "unconfigured")
    return (
      <div className="map-unavailable" role="status">
        <h3>Map unavailable</h3>
        <p>{tiles.message}</p>
      </div>
    );
  return (
    <div
      className="map-canvas"
      aria-label="Interactive map of Pettah shopping streets"
    >
      <MapContainer
        center={[6.9371978, 79.8519364]}
        zoom={16}
        minZoom={14}
        maxZoom={tiles.maxZoom}
        scrollWheelZoom={false}
        dragging
        touchZoom
        attributionControl
        className="leaflet-street-map"
      >
        <View streets={streets} selected={selected} />
        <GeographicTiles config={tiles} />
        {active?.geometry && (
          <Polyline
            positions={active.geometry}
            pathOptions={{ color: "#c84420", weight: 5, opacity: 0.85 }}
            interactive={false}
          />
        )}
        {streets
          .filter((s) => s.point)
          .map((s) => (
            <Marker
              key={s.slug}
              position={s.point!}
              icon={icons[s.slug === selected ? 1 : 0]}
              title={s.name}
              alt={`Select ${s.name}`}
              eventHandlers={{ click: () => onSelect(s.slug) }}
            >
              {s.slug === selected && (
                <Tooltip permanent direction="top" offset={[0, -20]}>
                  {s.name}
                </Tooltip>
              )}
              <Popup>
                <strong>{s.name}</strong>
                <p>{s.categories.map((c) => c.name).join(" · ")}</p>
                <p>Approximate street location · not a shop entrance</p>
                <a href={`/streets/${s.slug}`}>Explore Street →</a>
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
          Locations are not available for these streets. Use the street guides
          and name-based directions.
        </p>
      )}
    </div>
  );
}
