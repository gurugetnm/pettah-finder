import { ArrowUpRight } from "lucide-react";
import { directionsUrl } from "@/lib/utils/maps";
export function DirectionsLink({ destination }: { destination: string }) {
  return (
    <a
      href={directionsUrl(destination)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      Google Maps directions <ArrowUpRight size={17} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
