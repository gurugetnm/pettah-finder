import { expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StreetMap from "@/components/discovery/street-map";
it("shows explicit provider failure without substituting a decorative map", () => {
  const { container } = render(
    <StreetMap
      streets={[]}
      selection={null}
      onSelect={() => {}}
      tiles={{
        provider: "unconfigured",
        message: "Map unavailable: the tile provider is not configured.",
      }}
    />,
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "tile provider is not configured",
  );
  expect(container.querySelector(".leaflet-container")).toBeNull();
  expect(container.querySelector("svg")).toBeNull();
});
