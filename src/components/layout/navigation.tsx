"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, X, Sun, Moon, Monitor } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
const links = [
  ["/search", "Search"],
  ["/streets", "Explore Streets"],
  ["/categories", "Categories"],
] as const;
function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <div className="theme-switch">
      <Button
        variant="ghost"
        className="px-3"
        aria-label="Use light theme"
        onClick={() => setTheme("light")}
      >
        <Sun size={18} />
      </Button>
      <Button
        variant="ghost"
        className="px-3"
        aria-label="Use dark theme"
        onClick={() => setTheme("dark")}
      >
        <Moon size={18} />
      </Button>
      <Button
        variant="ghost"
        className="px-3"
        aria-label="Use system theme"
        onClick={() => setTheme("system")}
      >
        <Monitor size={18} />
      </Button>
    </div>
  );
}
export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Pettah Finder home">
          <span className="brand-mark">
            <MapPin size={23} strokeWidth={2.4} />
          </span>
          <span>
            Pettah<span className="text-primary">Finder</span>
            <small>YOUR MARKETPLACE COMPASS</small>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([href, text]) => (
            <Link
              key={href}
              href={href}
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              {text}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="mobile-menu px-3"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="shell mobile-nav"
        >
          {links.map(([href, text]) => (
            <Link
              href={href}
              key={href}
              onClick={() => setOpen(false)}
              aria-current={path.startsWith(href) ? "page" : undefined}
            >
              {text}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
