"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import {
  divIcon,
  latLngBounds,
  type DivIcon,
  type Map as LeafletMap,
  type TileLayer as LeafletTileLayer,
} from "leaflet";
import { useTheme } from "next-themes";
import { Maximize, RotateCcw } from "lucide-react";
import type { MapShop, MapStreet } from "@/lib/utils/street-map-data";
import type { TileConfiguration } from "@/lib/maps/tile-provider";
import "leaflet/dist/leaflet.css";
export type Selection = { kind: "street" | "shop"; slug: string } | null;
type PinState = "default" | "selected" | "muted";
const bag =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
const iconCache = new Map<string, DivIcon>();
function pin(kind: "street" | "shop", state: PinState) {
  const key = `${kind}-${state}`;
  if (!iconCache.has(key))
    iconCache.set(
      key,
      divIcon({
        className: "map-pin-wrapper",
        html: `<span class="${kind}-pin ${state}" aria-hidden="true">${kind === "shop" ? bag : "↗"}</span>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      }),
    );
  return iconCache.get(key)!;
}
const animate = () =>
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
// The mobile search bar and bottom sheet cover parts of the map; CSS publishes their sizes.
function insets(map: LeafletMap) {
  const style = getComputedStyle(map.getContainer());
  return {
    top: parseFloat(style.getPropertyValue("--map-top-inset")) || 0,
    bottom: parseFloat(style.getPropertyValue("--map-bottom-inset")) || 0,
  };
}
function fit(map: LeafletMap, points: [number, number][], maxZoom = 17) {
  if (!points.length) return;
  const { top, bottom } = insets(map);
  map.fitBounds(latLngBounds(points), {
    paddingTopLeft: [40, top + 40],
    paddingBottomRight: [40, bottom + 40],
    maxZoom,
    animate: animate(),
  });
}
function focusPoint(map: LeafletMap, point: [number, number], minZoom: number) {
  const zoom = Math.max(map.getZoom(), minZoom);
  const { top, bottom } = insets(map);
  const center = map.unproject(
    map.project(point, zoom).add([0, (bottom - top) / 2]),
    zoom,
  );
  map.setView(center, zoom, { animate: animate() });
}
function GeographicTiles({
  config,
}: {
  config: Exclude<TileConfiguration, { provider: "unconfigured" }>;
}) {
  const layer = useRef<LeafletTileLayer>(null);
  const { resolvedTheme } = useTheme();
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
        url={
          resolvedTheme === "dark" && config.darkUrl
            ? config.darkUrl
            : config.url
        }
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
                ? "Some map tiles could not load. The result list and directions still work."
                : "Map tiles could not load. Check your connection or use the result list and directions."
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
  shops = [],
  focus = null,
  selection,
  onSelect,
  tiles,
}: {
  streets: MapStreet[];
  shops?: MapShop[];
  /** Street slugs emphasized by an active search or category; null when nothing is filtered. */
  focus?: Set<string> | null;
  selection: Selection;
  onSelect: (selection: NonNullable<Selection>) => void;
  tiles: TileConfiguration;
}) {
  const [map, setMap] = useState<LeafletMap | null>(null);
  const allPoints = useMemo(
    () => streets.flatMap((s) => (s.point ? [s.point] : [])),
    [streets],
  );
  const resultPoints = useMemo(
    () => [
      ...streets.flatMap((s) =>
        s.point && (!focus || focus.has(s.slug)) ? [s.point] : [],
      ),
      ...shops.flatMap((s) => (s.point ? [s.point] : [])),
    ],
    [streets, shops, focus],
  );
  const street =
    selection?.kind === "street"
      ? streets.find((s) => s.slug === selection.slug)
      : undefined;
  const shop =
    selection?.kind === "shop"
      ? shops.find((s) => s.slug === selection.slug)
      : undefined;
  useEffect(() => {
    if (map) fit(map, resultPoints.length ? resultPoints : allPoints);
  }, [map, resultPoints, allPoints]);
  useEffect(() => {
    if (!map) return;
    if (street?.geometry) fit(map, street.geometry, 18);
    else if (street?.point) focusPoint(map, street.point, 17);
    else if (shop?.point) focusPoint(map, shop.point, 18);
  }, [map, street, shop]);
  useEffect(() => {
    if (!map) return;
    const observer = new ResizeObserver(() =>
      map.invalidateSize({ pan: false }),
    );
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  if (tiles.provider === "unconfigured")
    return (
      <div className="map-unavailable" role="status">
        <h2>Map unavailable</h2>
        <p>{tiles.message}</p>
      </div>
    );
  const state = (slug: string, selected: boolean): PinState =>
    selected ? "selected" : focus && !focus.has(slug) ? "muted" : "default";
  return (
    <div
      className="map-canvas"
      role="region"
      aria-label="Interactive map of Pettah shopping streets and verified shops"
    >
      <MapContainer
        ref={setMap}
        center={[6.9371978, 79.8519364]}
        zoom={16}
        minZoom={14}
        maxZoom={tiles.maxZoom}
        zoomControl={false}
        attributionControl
        className="leaflet-street-map"
      >
        <ZoomControl position="topright" />
        <GeographicTiles config={tiles} />
        {streets
          .filter((s) => s.geometry)
          .map((s) => {
            const pinState = state(s.slug, s.slug === street?.slug);
            return (
              <Polyline
                key={`${s.slug}-${pinState}`}
                positions={s.geometry!}
                pathOptions={{
                  className: `street-line ${pinState}`,
                  weight:
                    pinState === "selected" ? 7 : pinState === "muted" ? 3 : 5,
                }}
                eventHandlers={{
                  click: () => onSelect({ kind: "street", slug: s.slug }),
                }}
              />
            );
          })}
        {streets
          .filter((s) => s.point)
          .map((s) => {
            const selected = s.slug === street?.slug;
            return (
              <Marker
                key={s.slug}
                position={s.point!}
                icon={pin("street", state(s.slug, selected))}
                title={s.name}
                alt={`Select ${s.name}`}
                zIndexOffset={selected ? 1000 : 0}
                eventHandlers={{
                  click: () => onSelect({ kind: "street", slug: s.slug }),
                }}
              >
                {selected && (
                  <Tooltip permanent direction="top" offset={[0, -20]}>
                    {s.name}
                  </Tooltip>
                )}
              </Marker>
            );
          })}
        {shops
          .filter((s) => s.point)
          .map((s) => {
            const selected = s.slug === shop?.slug;
            return (
              <Marker
                key={s.slug}
                position={s.point!}
                icon={pin("shop", selected ? "selected" : "default")}
                title={s.name}
                alt={`Select shop ${s.name}`}
                zIndexOffset={selected ? 2000 : 500}
                eventHandlers={{
                  click: () => onSelect({ kind: "shop", slug: s.slug }),
                }}
              >
                {selected && (
                  <Tooltip permanent direction="top" offset={[0, -20]}>
                    {s.name}
                  </Tooltip>
                )}
              </Marker>
            );
          })}
      </MapContainer>
      <div className="map-actions">
        {focus && (
          <button
            type="button"
            onClick={() => map && fit(map, resultPoints)}
            disabled={!resultPoints.length}
          >
            <Maximize size={18} aria-hidden="true" /> Fit to results
          </button>
        )}
        <button type="button" onClick={() => map && fit(map, allPoints)}>
          <RotateCcw size={18} aria-hidden="true" /> Reset map
        </button>
      </div>
      {!allPoints.length && (
        <p className="map-no-points" role="status">
          Locations are not available for these streets. Use the result list
          and name-based directions.
        </p>
      )}
    </div>
  );
}
