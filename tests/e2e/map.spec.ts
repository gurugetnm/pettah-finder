import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { tileFixture } from "./helpers/map-tiles";
import locations from "../../src/data/street-locations.json";
const tilePattern = "https://tile.openstreetmap.org/**";
const streetCount = Object.keys(locations).length;
test.beforeEach(async ({ page }) => {
  await page.route(tilePattern, (route) =>
    route.fulfill({ contentType: "image/png", body: tileFixture }),
  );
});
const results = (page: Page) =>
  page.getByRole("region", { name: /Shopping streets|Streets to explore/ });
async function inside(page: Page, selector: string) {
  const box = (await page.locator(selector).boundingBox())!;
  const map = (await page.locator(".leaflet-container").boundingBox())!;
  const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
  return (
    x > map.x && x < map.x + map.width && y > map.y && y < map.y + map.height
  );
}
const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

test("home opens directly into a full-height map with a results sidebar", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.locator(".street-pin")).toHaveCount(streetCount);
  const map = (await page.locator(".leaflet-container").boundingBox())!;
  const panel = (await page.locator(".app-panel").boundingBox())!;
  expect(map.width / 1440).toBeGreaterThan(0.68);
  expect(map.y).toBeLessThan(80);
  expect(map.y + map.height).toBeGreaterThan(895);
  expect(panel.width).toBeGreaterThanOrEqual(300);
  expect(panel.width).toBeLessThanOrEqual(400);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= window.innerHeight,
    ),
  ).toBe(true);
  await expect(page.getByRole("searchbox")).toBeVisible();
  await expect(page.locator(".leaflet-control-attribution")).toContainText(
    "OpenStreetMap",
  );
  await page.getByRole("button", { name: "Hide list" }).click();
  await expect(page.locator(".app-panel")).toBeHidden();
  await expect
    .poll(
      async () =>
        (await page.locator(".leaflet-container").boundingBox())!.width,
    )
    .toBeGreaterThan(1400);
  await page.getByRole("button", { name: "Show list" }).click();
  await expect(page.locator(".app-panel")).toBeVisible();
  expect(errors).toEqual([]);
});

test("every street synchronizes the list, marker, details, URL and viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  for (const [slug, source] of Object.entries(locations)) {
    const button = results(page).getByRole("button", {
      name: source.sourceName,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(new RegExp(`\\?street=${slug}$`));
    const marker = `.leaflet-marker-icon[title="${source.sourceName}"]`;
    await expect(page.locator(`${marker} .street-pin.selected`)).toHaveCount(1);
    await expect(page.locator("#place-title")).toHaveText(source.sourceName);
    await expect.poll(() => inside(page, marker)).toBe(true);
    await expect(
      page.locator(".place-detail .directions-link"),
    ).toHaveAttribute(
      "href",
      new RegExp(`destination=${source.sourceName.split(" ").join("\\+")}`),
    );
    await expect(
      page.getByRole("link", { name: /Explore Street/ }),
    ).toHaveAttribute("href", `/streets/${slug}`);
  }
  await page.locator('.leaflet-marker-icon[title="Prince Street"]').click();
  await expect(page).toHaveURL(/\?street=prince-street$/);
  await expect(page.locator("#place-title")).toHaveText("Prince Street");
  await expect(
    results(page).getByRole("button", { name: /Prince Street/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Close details" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".street-pin.selected")).toHaveCount(0);
  const bounds = (await page.locator(".leaflet-container").boundingBox())!;
  const pane = page.locator(".leaflet-map-pane");
  const before = await pane.getAttribute("style");
  await page.mouse.move(bounds.x + 200, bounds.y + bounds.height - 120);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 300, bounds.y + bounds.height - 180, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(pane).not.toHaveAttribute("style", before!);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await page.getByRole("button", { name: "Reset map" }).click();
  for (const name of Object.values(locations).map((l) => l.sourceName))
    await expect
      .poll(() => inside(page, `.leaflet-marker-icon[title="${name}"]`))
      .toBe(true);
});

test("search and category filters update the list, map and shareable URL with history", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".street-pin")).toHaveCount(streetCount);
  await page.getByRole("searchbox").fill("Phone  Charger");
  await page.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/\/\?q=Phone\+\+Charger$/);
  await expect(
    page.getByRole("heading", { name: "Results for “phone charger”" }),
  ).toBeVisible();
  await expect(
    page.getByText("Matching categories: Mobile Accessories"),
  ).toBeVisible();
  await expect(results(page).getByRole("button")).toHaveCount(1);
  await expect(
    results(page).getByRole("button", { name: /1st Cross Street/ }),
  ).toBeVisible();
  await expect(page.getByText(/not confirmed stock/)).toBeVisible();
  await expect(page.locator(".street-pin.muted")).toHaveCount(streetCount - 1);
  await expect(page.locator(".street-pin.default")).toHaveCount(1);
  // Street geometry is styled by class; Leaflet's default blue must never show.
  await expect(page.locator("path.street-line.default")).toHaveCount(1);
  await expect(page.locator("path.street-line.muted")).toHaveCount(
    streetCount - 1,
  );
  await expect(page.locator("path.street-line.default")).toHaveCSS(
    "stroke",
    "rgb(200, 68, 32)",
  );
  await expect(
    page.getByRole("button", { name: "Fit to results" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Reset map" }).click();
  await page.getByRole("button", { name: "Fit to results" }).click();
  await expect
    .poll(() => inside(page, '.leaflet-marker-icon[title="1st Cross Street"]'))
    .toBe(true);
  await page.goto("/");
  const filters = page.getByRole("group", { name: "Filter by category" });
  await filters.getByRole("button", { name: "Jewellery" }).click();
  await expect(page).toHaveURL(/\?category=jewellery$/);
  await expect(results(page).getByRole("button")).toHaveCount(1);
  await expect(page.locator(".street-pin.muted")).toHaveCount(streetCount - 1);
  await results(page)
    .getByRole("button", { name: /Sea Street/ })
    .click();
  await expect(page).toHaveURL(/\?category=jewellery&street=sea-street$/);
  await page.goBack();
  await expect(page).toHaveURL(/\?category=jewellery$/);
  await expect(page.locator("#place-title")).toHaveCount(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".street-pin.muted")).toHaveCount(0);
  await page.goForward();
  await expect(page.locator(".street-pin.muted")).toHaveCount(streetCount - 1);
  await page.goto("/?q=zzzzunknown");
  await expect(
    page.getByRole("heading", { name: "Nothing found yet" }),
  ).toBeVisible();
  await expect(page.locator(".street-pin.muted")).toHaveCount(streetCount);
  await page.getByRole("link", { name: "Clear search" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator(".street-pin.muted")).toHaveCount(0);
});

test("tile failure is explicit and retry reloads tiles", async ({ page }) => {
  await page.unroute(tilePattern);
  await page.route(tilePattern, (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry map tiles" }),
  ).toBeVisible();
  await expect(page.locator(".map-tile-status")).toContainText(
    "could not load",
  );
  await expect(results(page).getByRole("button")).toHaveCount(streetCount);
  await page.unroute(tilePattern);
  await page.route(tilePattern, (route) =>
    route.fulfill({ contentType: "image/png", body: tileFixture }),
  );
  await page.getByRole("button", { name: "Retry map tiles" }).click();
  await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
  await expect(page.locator(".map-tile-status")).toHaveCount(0);
});

test("mobile bottom sheet keeps search, map controls and results usable", async ({
  page,
}) => {
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/");
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
    const app = page.locator(".map-app");
    await expect(app).toHaveAttribute("data-sheet", "collapsed");
    await expect(page.getByRole("searchbox")).toBeVisible();
    const map = (await page.locator(".leaflet-container").boundingBox())!;
    expect(map.width).toBe(width);
    expect(map.y + map.height).toBeGreaterThan(790);
    const sheet = page.locator(".app-panel");
    for (const control of ["Zoom in", "Zoom out"]) {
      const box = (await page
        .getByRole("button", { name: control, exact: true })
        .boundingBox())!;
      expect(overlaps(box, (await sheet.boundingBox())!)).toBe(false);
      expect(
        overlaps(box, (await page.locator(".app-search form").boundingBox())!),
      ).toBe(false);
    }
    await expect(page.locator(".leaflet-control-attribution")).toBeInViewport();
    expect(
      overlaps(
        (await page.locator(".leaflet-control-attribution").boundingBox())!,
        (await sheet.boundingBox())!,
      ),
    ).toBe(false);
    await page.getByRole("button", { name: "Show results" }).click();
    await expect(app).toHaveAttribute("data-sheet", "half");
    await page.getByRole("button", { name: "Expand results" }).press("ArrowUp");
    await expect(app).toHaveAttribute("data-sheet", "expanded");
    await page.getByRole("button", { name: "Collapse results" }).click();
    await expect(app).toHaveAttribute("data-sheet", "collapsed");
    // Dragging the handle upward expands the sheet without a click.
    const handle = (await page.locator(".sheet-handle").boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + 10);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2, handle.y - 120, {
      steps: 6,
    });
    await page.mouse.up();
    await expect(app).toHaveAttribute("data-sheet", "half");
    await results(page)
      .getByRole("button", { name: /Sea Street/ })
      .click();
    await expect(app).toHaveAttribute("data-sheet", "collapsed");
    await expect(page.locator("#place-title")).toBeInViewport();
    await expect(
      page.locator(".place-detail .directions-link"),
    ).toBeInViewport();
    await expect
      .poll(async () => {
        const marker = (await page
          .locator('.leaflet-marker-icon[title="Sea Street"]')
          .boundingBox())!;
        const top = (await sheet.boundingBox())!.y;
        return marker.y + marker.height <= top && marker.y >= 64 + 84;
      })
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `.local/screenshots/map-${width}-mobile.png`,
    });
  }
});

test("light default, dark mode and both themes stay accessible with the map loaded", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  for (const theme of ["dark", "light"]) {
    await page.getByRole("button", { name: "Change colour theme" }).click();
    await page.getByRole("button", { name: `Use ${theme} theme` }).click();
    await page.reload();
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
    if (theme === "dark")
      await expect(page.locator("html")).toHaveClass(/dark/);
    else await expect(page.locator("html")).not.toHaveClass(/dark/);
    const background = await page
      .locator(".app-panel")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe(
      theme === "dark" ? "rgb(34, 34, 30)" : "rgb(255, 253, 249)",
    );
    await page.getByRole("button", { name: "Show results" }).click();
    await results(page)
      .getByRole("button", { name: /Sea Street/ })
      .click();
    for (const sheet of ["collapsed", "half"]) {
      if (sheet === "half")
        await page.getByRole("button", { name: "Show results" }).click();
      const result = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ])
        .analyze();
      expect(result.violations, `${theme} ${sheet}`).toEqual([]);
    }
    await page.screenshot({ path: `.local/screenshots/map-390-${theme}.png` });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const theme of ["dark", "light"]) {
    await page.getByRole("button", { name: "Change colour theme" }).click();
    await page.getByRole("button", { name: `Use ${theme} theme` }).click();
    await page.goto("/?q=charger&street=1st-cross-street");
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    expect(result.violations, `desktop ${theme}`).toEqual([]);
    await page.screenshot({ path: `.local/screenshots/map-1440-${theme}.png` });
  }
});

test("verified shops with coordinates get distinct markers; others stay list-only", async ({
  page,
}) => {
  const { Client } = await import("pg");
  const { testDatabaseUrl } =
    await import("../../src/lib/validations/test-database");
  const url = testDatabaseUrl(process.env.TEST_DATABASE_URL);
  if (process.env.DATABASE_URL !== url)
    throw new Error("E2E server must use the guarded test database");
  const db = new Client({ connectionString: url });
  await db.connect();
  // [id, published, verified, latitude, longitude]: only the first is public and plotted.
  const fixtures = [
    ["e2e-map-fixture-plotted", "PUBLISHED", "VERIFIED", 6.93575, 79.85098],
    ["e2e-map-fixture-unplotted", "PUBLISHED", "VERIFIED", null, null],
    ["e2e-map-fixture-draft", "DRAFT", "VERIFIED", 6.9358, 79.851],
    ["e2e-map-fixture-unverified", "PUBLISHED", "UNVERIFIED", 6.9358, 79.851],
  ] as const;
  const ids = fixtures.map(([id]) => id);
  try {
    for (const [id, publication, verification, lat, lon] of fixtures) {
      await db.query(
        'INSERT INTO "Shop" (id, slug, name, description, "streetId", "publicationStatus", "verificationStatus", latitude, longitude, "contactPhone", "updatedAt") VALUES ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
        [
          id,
          `TEST FIXTURE ${id}`,
          "Isolated automated test fixture; not a real business.",
          "1st-cross-street",
          publication,
          verification,
          lat,
          lon,
          "+94 11 000 0000",
        ],
      );
      await db.query(
        'INSERT INTO "ShopCategory" ("shopId", "categoryId") VALUES ($1, $2)',
        [id, "mobile-accessories"],
      );
      await db.query(
        'INSERT INTO "ShopProduct" ("shopId", "productId") VALUES ($1, $2)',
        [id, "phone-charger"],
      );
    }
    await page.goto("/?q=charger");
    await expect(page.locator(".leaflet-tile-loaded").first()).toBeVisible();
    await expect(page.locator(".shop-pin")).toHaveCount(1);
    const shops = page.getByRole("region", { name: /Verified shops/ });
    await expect(shops.getByRole("button")).toHaveCount(2);
    await expect(
      shops.getByRole("button", { name: /e2e-map-fixture-unplotted/ }),
    ).toContainText("No verified map location");
    await page
      .locator(
        '.leaflet-marker-icon[title="TEST FIXTURE e2e-map-fixture-plotted"]',
      )
      .click();
    await expect(page).toHaveURL(/shop=e2e-map-fixture-plotted/);
    await expect(page.locator(".shop-pin.selected")).toHaveCount(1);
    const detail = page.locator(".place-detail");
    await expect(detail.locator("#place-title")).toHaveText(
      "TEST FIXTURE e2e-map-fixture-plotted",
    );
    await expect(detail).toContainText("Mobile Accessories");
    await expect(
      detail.getByRole("link", { name: /Call shop/ }),
    ).toHaveAttribute("href", /^tel:/);
    await expect(detail.locator(".directions-link")).toHaveAttribute(
      "href",
      /destination=TEST\+FIXTURE/,
    );
    await detail.getByRole("button", { name: "1st Cross Street" }).click();
    await expect(page).toHaveURL(/street=1st-cross-street/);
    await expect(page.locator(".place-shops")).toContainText(
      "e2e-map-fixture-plotted",
    );
    await page
      .locator(".place-shops")
      .getByRole("button", { name: /e2e-map-fixture-plotted/ })
      .click();
    await page.getByRole("link", { name: /Shop details/ }).click();
    await expect(page).toHaveURL(/\/shops\/e2e-map-fixture-plotted$/);
  } finally {
    await db.query('DELETE FROM "Shop" WHERE id = ANY($1::text[])', [ids]);
    await db.end();
  }
});
