import { expect, test } from "@playwright/test";
import { tileFixture } from "./helpers/map-tiles";
import locations from "../../src/data/street-locations.json";
const tilePattern = "https://tile.openstreetmap.org/**";
test.beforeEach(async ({ page }) => {
  await page.route(tilePattern, (route) =>
    route.fulfill({ contentType: "image/png", body: tileFixture }),
  );
});
test("every street synchronizes the list, marker, panel and viewport", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".explorer-map-area").scrollIntoViewIfNeeded();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  const list = page.getByRole("group", { name: "Choose a street" });
  for (const source of Object.values(locations)) {
    await list
      .getByRole("button", { name: source.sourceName, exact: false })
      .click();
    await expect(
      list.getByRole("button", { name: source.sourceName, exact: false }),
    ).toHaveAttribute("aria-pressed", "true");
    const marker = page.locator(
      `.leaflet-marker-icon[title="${source.sourceName}"]`,
    );
    await expect(marker.locator(".selected")).toHaveCount(1);
    await expect(page.locator(".explorer-detail h3")).toHaveText(
      source.sourceName,
    );
    const position = await marker.boundingBox();
    const bounds = await page.locator(".leaflet-container").boundingBox();
    expect(position!.x + 22).toBeGreaterThan(bounds!.x);
    expect(position!.x + 22).toBeLessThan(bounds!.x + bounds!.width);
    expect(position!.y + 22).toBeGreaterThan(bounds!.y);
    expect(position!.y + 22).toBeLessThan(bounds!.y + bounds!.height);
    await marker.click();
    await expect(page.locator(".leaflet-popup-content strong")).toHaveText(
      source.sourceName,
    );
    await expect(
      page.locator(".explorer-detail .directions-link"),
    ).toHaveAttribute(
      "href",
      new RegExp(`destination=${source.sourceName.split(" ").join("\\+")}`),
    );
    await page.getByRole("button", { name: "Close popup" }).click();
    await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
  }
  await list.getByRole("button", { name: /1st Cross Street/ }).click();
  await page.locator('.leaflet-marker-icon[title="Prince Street"]').click();
  await expect(
    list.getByRole("button", { name: /Prince Street/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".explorer-detail h3")).toHaveText("Prince Street");
  await page.getByRole("button", { name: "Close popup" }).click();
  await expect(page.locator(".leaflet-popup-content")).toHaveCount(0);
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  const bounds = await page.locator(".leaflet-container").boundingBox();
  const pane = page.locator(".leaflet-map-pane");
  const before = await pane.getAttribute("style");
  await page.mouse.move(bounds!.x + 80, bounds!.y + bounds!.height - 90);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + 150, bounds!.y + bounds!.height - 130, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(pane).not.toHaveAttribute("style", before!);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
});
test("tile failure is explicit and retry reloads tiles", async ({ page }) => {
  await page.unroute(tilePattern);
  await page.route(tilePattern, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await page.locator(".explorer-map-area").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Retry map tiles" }),
  ).toBeVisible();
  await expect(page.locator(".map-tile-status")).toContainText(
    "could not load",
  );
  await expect(
    page.locator(".explorer-actions .directions-link"),
  ).toBeVisible();
  await page.unroute(tilePattern);
  await page.route(tilePattern, (route) =>
    route.fulfill({ contentType: "image/png", body: tileFixture }),
  );
  await page.getByRole("button", { name: "Retry map tiles" }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.locator(".map-tile-status")).toHaveCount(0);
});
test("responsive maps have controls, loaded raster images and no overflow", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.locator(".explorer-map-area").scrollIntoViewIfNeeded();
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zoom in", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Zoom out", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".leaflet-container")).toHaveClass(
      /leaflet-grab/,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
  }
});
