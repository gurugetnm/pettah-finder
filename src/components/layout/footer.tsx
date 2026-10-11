import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div>
          <Link href="/" className="brand">
            <MapPin className="text-primary" />
            <span>Pettah Finder</span>
          </Link>
          <p>
            Find the right street.
            <br />
            Discover the right shop.
          </p>
        </div>
        <nav aria-label="Footer navigation">
          <span className="eyebrow">EXPLORE PETTAH</span>
          <Link href="/streets">
            Shopping streets <ArrowUpRight size={16} />
          </Link>
          <Link href="/categories">
            Product categories <ArrowUpRight size={16} />
          </Link>
          <Link href="/search">
            Find a product <ArrowUpRight size={16} />
          </Link>
        </nav>
        <div>
          <span className="eyebrow">A LOCAL GUIDE, IN THE MAKING</span>
          <p>
            Helping you explore Colombo’s busiest marketplace. Street
            specializations are preliminary; availability varies. Confirm
            details before you travel.
          </p>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} Pettah Finder</span>
        <span>Made for discovering Pettah, Colombo 🇱🇰</span>
      </div>
    </footer>
  );
}
