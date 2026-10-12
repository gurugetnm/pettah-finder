import { describe, expect, it } from "vitest";
import { streetMapData, validPettahPoint } from "@/lib/utils/street-map-data";
import { tileConfiguration } from "@/lib/maps/tile-provider";
import locations from "@/data/street-locations.json";
import type { StreetSummary } from "@/features/discovery/repository";
function street(
  slug: string,
  name: string,
  lat: number | null = null,
  lon: number | null = null,
): StreetSummary {
  return {
    id: slug,
    slug,
    name,
    description: "Test street",
    locationDescription: "Pettah",
    latitude: lat,
    longitude: lon,
    categories: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as StreetSummary;
}
describe("street map data provenance", () => {
  it("maps all source-matched streets to real representative geometry nodes", () => {
    const mapped = streetMapData(
      Object.entries(locations).map(([slug, source]) =>
        street(slug, source.sourceName),
      ),
    );
    expect(mapped).toHaveLength(6);
    for (const s of mapped) {
      expect(s.point).toEqual(
        locations[s.slug as keyof typeof locations].point,
      );
      expect(s.geometry).toContainEqual(s.point);
      expect(validPettahPoint(...s.point!)).toEqual(s.point);
    }
  });
  it("uses valid recorded coordinates and retains missing locations without fake pins", () => {
    const [recorded, missing] = streetMapData([
      street("recorded", "Recorded street", 6.938, 79.854),
      street("unknown", "Unknown street"),
    ]);
    expect(recorded.point).toEqual([6.938, 79.854]);
    expect(recorded.geometry).toBeUndefined();
    expect(missing.point).toBeNull();
  });
  it("rejects invalid, partial and unrelated regional coordinates", () => {
    for (const [lat, lon] of [
      [null, 79.854],
      [6.938, null],
      [NaN, 79.854],
      [6.938, Infinity],
      [0, 0],
      [51.5, -0.12],
    ] as [number | null, number | null][])
      expect(validPettahPoint(lat, lon)).toBeNull();
  });
  it("does not assign a source point to a renamed or ambiguous street", () => {
    expect(
      streetMapData([street("sea-street", "Different Sea Street")])[0].point,
    ).toBeNull();
  });
});
describe("tile provider configuration", () => {
  it("permits standard OSM only for local viewing", () => {
    expect(tileConfiguration({ local: true })).toMatchObject({
      provider: "osm-standard",
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    });
    expect(tileConfiguration({ local: true })).not.toHaveProperty("darkUrl");
    expect(
      tileConfiguration({ local: false, provider: "osm-standard" }).provider,
    ).toBe("unconfigured");
  });
  it("requires an explicit production provider/key and includes both attributions", () => {
    expect(tileConfiguration({ local: false }).provider).toBe("unconfigured");
    expect(
      tileConfiguration({ local: false, provider: "carto" }).provider,
    ).toBe("unconfigured");
    const config = tileConfiguration({
      local: false,
      provider: "carto",
      publicKey: "public_basemap_fixture",
    });
    expect(config.provider).toBe("carto");
    if (config.provider !== "unconfigured") {
      expect(config.url).toContain("?key=public_basemap_fixture");
      expect(config.darkUrl).toContain("/dark_all/");
      expect(config.darkUrl).toContain("?key=public_basemap_fixture");
      expect(config.attribution).toContain("OpenStreetMap");
      expect(config.attribution).toContain("CARTO");
    }
  });
  it("rejects unknown providers or unsafe key material", () => {
    expect(
      tileConfiguration({ local: true, provider: "unknown" }).provider,
    ).toBe("unconfigured");
    expect(
      tileConfiguration({
        local: false,
        provider: "carto",
        publicKey: '"><script>bad</script>',
      }).provider,
    ).toBe("unconfigured");
  });
});
