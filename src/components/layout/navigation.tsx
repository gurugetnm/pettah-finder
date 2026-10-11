"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, X, Sun, Moon, Monitor, SunMoon } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useRef, useState, useSyncExternalStore } from "react";
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
  ["/", "Explore"],
  ["/streets", "Streets"],
  ["/categories", "Categories"],
  ["/shops", "Shops"],
] as const;
const subscribeToHydration = () => () => {};
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const details = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={details}
      className="theme-switch"
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary role="button" aria-label="Change colour theme">
        <SunMoon size={20} />
      </summary>
      <div className="theme-popover" role="group" aria-label="Colour theme">
        {[
          { choice: "light", Icon: Sun },
          { choice: "dark", Icon: Moon },
          { choice: "system", Icon: Monitor },
        ].map(({ choice, Icon }) => {
          return (
            <Button
              variant="ghost"
              key={choice}
              aria-label={`Use ${choice} theme`}
              aria-pressed={hydrated && theme === choice}
              onClick={() => {
                setTheme(choice);
                if (details.current) {
                  details.current.open = false;
                  details.current.querySelector("summary")?.focus();
                }
              }}
            >
              <Icon size={18} />
              {choice === "system"
                ? "System preference"
                : `${choice[0].toUpperCase()}${choice.slice(1)} mode`}
            </Button>
          );
        })}
      </div>
    </details>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);
  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (open && event.key === "Escape") {
          event.preventDefault();
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label="Pettah Finder home">
          <span className="brand-mark">
            <MapPin size={23} strokeWidth={2.4} />
          </span>
          <span>
            Pettah Finder<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label="Main navigation" className="desktop-nav">
          {links.map(([href, text]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "page"
                  : undefined
              }
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
            ref={menuButton}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls={open ? "mobile-navigation" : undefined}
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
              aria-current={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {text}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
