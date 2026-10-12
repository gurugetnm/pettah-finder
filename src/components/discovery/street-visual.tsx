import { MapPin, Store } from "lucide-react";
// Honest, lightweight neighbourhood identity while street-specific licensed photography is unavailable.
export function StreetVisual({ name }: { slug: string; name: string }) {
  return (
    <div
      className="street-visual street-identity"
      aria-label={`Street guide for ${name}`}
      role="img"
    >
      <Store size={48} strokeWidth={1.2} aria-hidden="true" />
      <span>
        <strong>Pettah, Colombo</strong>
        <small>
          <MapPin size={13} aria-hidden="true" />
          Neighbourhood shopping guide
        </small>
      </span>
    </div>
  );
}
