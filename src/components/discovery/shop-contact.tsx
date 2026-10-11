import { Phone } from "lucide-react";
import { phoneHref } from "@/lib/validations/contact";
export function ShopContact({ phone }: { phone: string | null }) {
  const href = phoneHref(phone);
  return href ? (
    <a
      href={href}
      className="text-link"
      aria-label={`Call shop at ${phone?.trim()}`}
    >
      <Phone size={17} />
      {phone?.trim()}
    </a>
  ) : (
    <p>No contact phone recorded.</p>
  );
}
