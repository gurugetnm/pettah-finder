import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  const subscribe = (onChange: () => void) => {
    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  };
  return {
    usePathname: () => "/",
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(subscribe, () => window.location.search),
      ),
  };
});
// Mirrors the Next router integration: native pushState updates useSearchParams subscribers.
const pushState = window.history.pushState.bind(window.history);
window.history.pushState = (...args) => {
  pushState(...args);
  window.dispatchEvent(new PopStateEvent("popstate"));
};
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
