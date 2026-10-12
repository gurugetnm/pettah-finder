"use client";
import type { TileConfiguration } from "@/lib/maps/tile-provider";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRight, MapPin } from "lucide-react";
import { DirectionsLink } from "./directions-link";
export type MapStreet = {
  slug: string;
  name: string;
  description: string;
  categories: { name: string; slug: string }[];
  point: [number, number] | null;
};
const StreetMap = dynamic(() => import("./street-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      Loading the street map…
    </div>
  ),
});
export function StreetExplorer({
  streets,
  tiles,
}: {
  streets: MapStreet[];
  tiles: TileConfiguration;
}) {
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState(streets[0]?.slug ?? "");
  const [load, setLoad] = useState(false);
  const mapArea = useRef<HTMLDivElement>(null);
  const categoryId = useId();
  useEffect(() => {
    const area = mapArea.current;
    if (!area) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );
    observer.observe(area);
    return () => observer.disconnect();
  }, []);
  const visible = useMemo(
    () =>
      streets.filter(
        (s) => !category || s.categories.some((c) => c.slug === category),
      ),
    [streets, category],
  );
  const active = visible.find((s) => s.slug === selected) ?? visible[0];
  const categories = Array.from(
    new globalThis.Map(
      streets.flatMap((s) => s.categories).map((c) => [c.slug, c]),
    ).values(),
  );
  return (
    <div className="street-explorer">
      <div className="explorer-sidebar">
        <label htmlFor={categoryId}>What are you shopping for?</label>
        <select
          id={categoryId}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <div
          className="explorer-list"
          role="group"
          aria-label="Choose a street"
        >
          {visible.map((s) => (
            <button
              key={s.slug}
              type="button"
              aria-pressed={s.slug === active?.slug}
              onClick={() => {
                setSelected(s.slug);
                setLoad(true);
              }}
            >
              <MapPin size={17} />
              <span>
                {s.name}
                <small>{s.categories.map((c) => c.name).join(" · ")}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
        {!visible.length && <p>No streets match this category yet.</p>}
        {active && (
          <div className="explorer-detail">
            <h3>{active.name}</h3>
            <p>{active.description}</p>
            <div className="explorer-actions">
              <Link className="text-link" href={`/streets/${active.slug}`}>
                Street guide <ArrowRight size={16} />
              </Link>
              <DirectionsLink destination={active.name} compact />
            </div>
          </div>
        )}
      </div>
      <div className="explorer-map-area" ref={mapArea}>
        {load ? (
          <MapBoundary>
            <StreetMap
              tiles={tiles}
              streets={visible}
              selected={active?.slug}
              onSelect={setSelected}
            />
          </MapBoundary>
        ) : (
          <div className="map-loading" role="status">
            Loading the Pettah map…
          </div>
        )}
        <p className="map-caption">
          Representative street points, not shop entrances.{" "}
          <a href="https://www.openstreetmap.org/copyright">
            © OpenStreetMap contributors
          </a>
        </p>
      </div>
    </div>
  );
}

class MapBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="map-loading" role="status">
        <h3>The map could not load.</h3>
        <p>
          Use the street guides and directions on this page to keep exploring.
        </p>
        <button
          className="map-load-button"
          onClick={() => this.setState({ failed: false })}
        >
          Try the map again
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
