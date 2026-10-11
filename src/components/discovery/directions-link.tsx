import { ArrowUpRight } from "lucide-react";
import { directionsUrl } from "@/lib/utils/maps";
export function DirectionsLink({
  destination,
  compact = false,
}: {
  destination: string;
  compact?: boolean;
}) {
  return (
    <a
      href={directionsUrl(destination)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link directions-link"
      aria-label={`Google Maps directions to ${destination} (opens in a new tab)`}
    >
      {compact ? "Directions" : "Google Maps directions"}{" "}
      <ArrowUpRight size={17} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
