import Link from "next/link";
import { MapPin } from "lucide-react";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div>
            <Link href="/" className="brand">
              <MapPin className="text-primary" size={20} />
              <span>
                Pettah Finder<span className="brand-dot">.</span>
              </span>
            </Link>
            <p>Find the right street. Discover the right shop.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/streets">Streets</Link>
            <Link href="/categories">Categories</Link>
            <Link href="/shops">Shops</Link>
            <Link href="/search">Search</Link>
            <Link href="/image-credits">Photo & map credits</Link>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Pettah Finder · Colombo, Sri Lanka
          </span>
          <p>
            Our guide is growing. Street associations are preliminary; verify
            details before you visit.
          </p>
        </div>
      </div>
    </footer>
  );
}
