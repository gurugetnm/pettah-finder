export type TileConfiguration =
  | {
      provider: "osm-standard" | "carto";
      url: string;
      // Real dark basemap when the provider offers one; otherwise the light tiles stay readable in dark mode.
      darkUrl?: string;
      attribution: string;
      maxZoom: number;
    }
  | { provider: "unconfigured"; message: string };
const osmAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export function tileConfiguration({
  provider,
  publicKey,
  local,
}: {
  provider?: string;
  publicKey?: string;
  local: boolean;
}): TileConfiguration {
  if (provider === "carto" || (!provider && publicKey)) {
    if (!publicKey || !/^[a-zA-Z0-9_-]{8,200}$/.test(publicKey))
      return {
        provider: "unconfigured",
        message:
          "Map unavailable: the tile provider is not configured. Use the street guides and directions below.",
      };
    return {
      provider: "carto",
      url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${encodeURIComponent(publicKey)}`,
      darkUrl: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${encodeURIComponent(publicKey)}`,
      attribution: `${osmAttribution}, &copy; <a href="https://carto.com/attribution/">CARTO</a>`,
      maxZoom: 20,
    };
  }
  if (local && (!provider || provider === "osm-standard"))
    return {
      provider: "osm-standard",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: osmAttribution,
      maxZoom: 19,
    };
  return {
    provider: "unconfigured",
    message:
      "Map unavailable: the tile provider is not configured. Use the street guides and directions below.",
  };
}
export function getTileConfiguration(): TileConfiguration {
  let local = process.env.NODE_ENV !== "production";
  try {
    if (process.env.SITE_URL)
      local ||= ["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(process.env.SITE_URL).hostname,
      );
  } catch {
    /* Invalid site origin cannot authorize a local tile fallback. */
  }
  return tileConfiguration({
    provider: process.env.MAP_TILE_PROVIDER,
    publicKey: process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY,
    local,
  });
}
