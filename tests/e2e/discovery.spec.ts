import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
// Deterministic browser fixtures; no public tile-server traffic during interaction/width sweeps.
import { tileFixture } from "./helpers/map-tiles";
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: tileFixture }),
  );
});

test("product discovery journey", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Find where products are sold in Pettah",
  );
  await page.getByRole("searchbox").fill("charger");
  await page.getByRole("button", { name: "Search Pettah" }).click();
  await expect(page).toHaveURL(/\/\?q=charger$/);
  await expect(
    page.getByText("Matching categories: Mobile Accessories"),
  ).toBeVisible();
  await page
    .getByRole("region", { name: /Streets to explore/ })
    .getByRole("button", { name: /1st Cross Street/ })
    .click();
  await page.getByRole("link", { name: /Explore Street/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "1st Cross Street",
  );
  await expect(
    page.getByText("No individual businesses have been listed yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page
      .locator(".detail-actions")
      .getByRole("link", { name: /Google Maps directions/ }),
  ).toHaveAttribute("href", /google\.com\/maps\/dir\/\?api=1&destination=/);
  await page.getByRole("link", { name: "View on map" }).click();
  await expect(page).toHaveURL(/\/\?street=1st-cross-street$/);
  await expect(page.locator("#place-title")).toHaveText("1st Cross Street");
  await page.goto("/search?q=charger");
  await expect(
    page.getByRole("heading", { name: "Mobile Accessories" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /Show these results on the map/ })
    .click();
  await expect(page).toHaveURL(/\/\?q=charger$/);
});
test("categories, filters, empty states and missing routes", async ({
  page,
}) => {
  await page.goto("/categories");
  await page
    .getByRole("link")
    .filter({ has: page.getByRole("heading", { name: "Mobile Accessories" }) })
    .click();
  await expect(page).toHaveURL(/category=mobile-accessories/);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(1);
  await page.goto("/shops");
  await expect(page.getByText("No verified shops to show yet.")).toBeVisible();
  await page.getByRole("button", { name: "Find shops" }).click();
  await expect(page.getByText("No verified shops to show yet.")).toBeVisible();
  await page.goto("/search?q=zzzzunknown");
  await expect(page.getByText("No streets found just yet")).toBeVisible();
  await page.goto("/search?q=a&q=b");
  await expect(
    page.getByRole("alert").filter({ hasText: "Please enter a single query" }),
  ).toBeVisible();
  for (const path of [
    "/streets/missing-street",
    "/shops/missing-shop",
    "/missing-route",
    "/admin",
    "/login",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "couldn’t find",
    );
  }
});
test("mobile navigation and theme persistence", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  // Light is the default appearance even when the system prefers dark.
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Change colour theme" }).click();
  await page.getByRole("button", { name: "Use dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "Change colour theme" }).click();
  await page.getByRole("button", { name: "Use light theme" }).click();
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Shops" })
    .click();
  await expect(page).toHaveURL(/\/shops$/);
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
});
test("all target widths avoid horizontal overflow", async ({ page }) => {
  for (const width of [320, 360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/categories",
      "/streets",
      "/streets/1st-cross-street",
      "/search?q=charger",
      "/shops",
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      );
      expect(overflow, `${path} at ${width}px`).toBe(false);
    }
  }
});
test("security headers, SEO and healthy database", async ({ request }) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({ status: "ok" });
  const response = await request.get("/streets/sea-street");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  const html = await response.text();
  expect(html).toContain("Sea Street | Pettah Finder");
  expect(html).not.toContain("postgresql://");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect((await request.get("/robots.txt")).status()).toBe(200);
});

test("public shop details and visibility rules with isolated fixtures", async ({
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
  const fixtureIds = [
    "e2e-test-fixture-public",
    "e2e-test-fixture-draft",
    "e2e-test-fixture-unverified",
  ];
  try {
    for (const [i, slug] of fixtureIds.entries()) {
      await db.query(
        'INSERT INTO "Shop" (id, slug, name, description, "streetId", "publicationStatus", "verificationStatus", "updatedAt") VALUES ($1, $1, $2, $3, $4, $5, $6, NOW())',
        [
          slug,
          `TEST FIXTURE ${slug}`,
          "Isolated automated test fixture; not a real business.",
          "1st-cross-street",
          i === 1 ? "DRAFT" : "PUBLISHED",
          i === 2 ? "UNVERIFIED" : "VERIFIED",
        ],
      );
      await db.query(
        'INSERT INTO "ShopCategory" ("shopId", "categoryId") VALUES ($1, $2)',
        [slug, "mobile-accessories"],
      );
      await db.query(
        'INSERT INTO "ShopProduct" ("shopId", "productId") VALUES ($1, $2)',
        [slug, "phone-charger"],
      );
    }
    await page.goto(
      "/shops?q=charger&category=mobile-accessories&street=1st-cross-street",
    );
    await page
      .getByRole("link", { name: "TEST FIXTURE e2e-test-fixture-public" })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "TEST FIXTURE e2e-test-fixture-public",
    );
    await expect(
      page.getByRole("link", { name: "Phone charger" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Google Maps directions/ }),
    ).toHaveAttribute("href", /destination=TEST/);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of [
        "/shops?q=charger",
        "/shops/e2e-test-fixture-public",
      ]) {
        await page.goto(path);
        await page.getByRole("heading", { level: 1 }).waitFor();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth,
          ),
          `${path} at ${width}px`,
        ).toBe(false);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const theme of ["light", "dark"]) {
      await page.getByRole("button", { name: "Change colour theme" }).click();
      await page.getByRole("button", { name: `Use ${theme} theme` }).click();
      for (const path of [
        "/shops?q=charger",
        "/shops/e2e-test-fixture-public",
      ]) {
        await page.goto(path);
        await page.getByRole("heading", { level: 1 }).waitFor();
        const result = await new AxeBuilder({ page })
          .withTags([
            "wcag2a",
            "wcag2aa",
            "wcag21aa",
            "wcag22aa",
            "best-practice",
          ])
          .analyze();
        expect(result.violations, `${path} in ${theme} mode`).toEqual([]);
      }
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `.local/screenshots/shop-390-${theme}.png`,
        fullPage: true,
      });
    }
    for (const slug of fixtureIds.slice(1))
      expect((await page.goto(`/shops/${slug}`))?.status()).toBe(404);
    await page.goto("/search?q=charger");
    await expect(
      page.getByRole("heading", { name: "Matching shops" }),
    ).toBeVisible();
    await page.goto("/sitemap.xml");
    await expect(page.locator("body")).toContainText(
      "/shops/e2e-test-fixture-public",
    );
    await expect(page.locator("body")).not.toContainText(
      "/shops/e2e-test-fixture-draft",
    );
  } finally {
    await db.query('DELETE FROM "Shop" WHERE id = ANY($1::text[])', [
      fixtureIds,
    ]);
    await db.end();
  }
});

test("visual review captures", async ({ page }) => {
  for (const [width, theme] of [
    [1440, "light"],
    [390, "light"],
    [390, "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Change colour theme" }).click();
    await page.getByRole("button", { name: `Use ${theme} theme` }).click();
    for (const [path, name] of [
      ["/", "home"],
      ["/search?q=charger", "search"],
      ["/streets/2nd-cross-street", "street"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: `.local/screenshots/${name}-${width}-${theme}.png`,
        fullPage: true,
      });
    }
  }
});

test("public pages pass automated accessibility checks in both themes", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const theme of ["light", "dark"]) {
    await page.goto("/");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.getByRole("button", { name: "Change colour theme" }).click();
    await page.getByRole("button", { name: `Use ${theme} theme` }).click();
    for (const path of [
      "/",
      "/categories",
      "/streets",
      "/streets/2nd-cross-street",
      "/shops",
      "/search?q=charger",
      "/search?q=zzzzunknown",
      "/missing-route",
    ]) {
      await page.goto(path);
      await page.getByRole("heading", { level: 1 }).waitFor();
      const result = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ])
        .analyze();
      expect(result.violations, `${path} in ${theme} mode`).toEqual([]);
    }
  }
});

test("keyboard skip link and menu dismissal restore useful focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await page.getByRole("heading", { level: 1 }).waitFor();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeFocused();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Change colour theme" }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Change colour theme" }),
  ).toBeFocused();
  await expect(
    page.getByRole("group", { name: "Colour theme" }),
  ).not.toBeVisible();
});
