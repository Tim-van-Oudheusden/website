import type { Locator, Page } from "@playwright/test";

import { DEV_HIVE_METRICS } from "../back-end/src/features/hive/hive-metrics-dev-fixture";
import { AGENTIC_DESIGNS } from "../front-end/src/features/agentic/config/agentic-designs";
import type { HiveMetricsResponse } from "../shared/src/index";

import { expect, test } from "./fixtures";

// The dev pod runs without HIVE_BASE_URL, so GET /api/hive/metrics serves DEV_HIVE_METRICS.
// Charts: queue, governor mode, contributor tasks, runs by backend, PRs per day and who wrote them.
const CHARTS = DEV_HIVE_METRICS.contributors?.runs7d.backends.length === 0 ? 5 : 6;

/** Each chart's plot once ECharts has drawn into it. */
function drawnPlots(page: Page): Locator {
  return page.locator("section#metrics .ag-plot[data-state=ready] svg");
}

test.describe("Agentic metrics section", () => {
  test("shows the four numbers and draws every chart from the dev fixture", async ({ page }) => {
    await page.goto("/agentic#metrics", { waitUntil: "domcontentloaded" });
    const section = page.locator("section#metrics");

    await expect(section.getByRole("heading", { level: 2, name: "The hive, live" })).toBeVisible();
    await expect(section.getByRole("list", { name: "Hive right now" }).getByRole("listitem")).toHaveCount(4);
    await expect(section.locator("figure")).toHaveCount(CHARTS);
    await expect(drawnPlots(page)).toHaveCount(CHARTS);
  });

  test("explains instead of drawing empty charts when the metrics are unavailable", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/hive/metrics", async (route) => {
      const body: HiveMetricsResponse = { state: "unavailable", fetchedAt: null, metrics: null };

      await route.fulfill({ json: body });
    });

    await page.goto("/agentic#metrics", { waitUntil: "domcontentloaded" });
    const section = page.locator("section#metrics");

    await expect(section.getByText("The live numbers are not available right now")).toBeVisible();
    await expect(section.getByText("Offline", { exact: true })).toBeVisible();
    await expect(section.locator("figure")).toHaveCount(0);
    await expect(section.getByRole("list", { name: "Hive right now" })).toHaveCount(0);
  });
});

test.describe("Agentic design switcher", () => {
  test("switches between all ten designs, each drawing every chart", async ({ page }) => {
    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    const switcher = page.getByRole("navigation", { name: "Page design" });

    await expect(switcher.getByRole("link")).toHaveCount(AGENTIC_DESIGNS.length);

    for (const design of AGENTIC_DESIGNS) {
      await switcher.getByRole("link", { name: design.name }).click();

      await expect(page).toHaveURL(`/agentic?design=${design.slug}`);
      await expect(page.locator("main")).toHaveAttribute("data-design", design.slug);
      await expect(switcher.getByRole("link", { name: design.name })).toHaveAttribute("aria-current", "true");
      await expect(drawnPlots(page)).toHaveCount(CHARTS);
    }
  });

  test("keeps every number on screen and every chart still under reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/agentic?design=synthwave", { waitUntil: "domcontentloaded" });
    await expect(drawnPlots(page)).toHaveCount(CHARTS);

    const animated = await page.evaluate(() => [...document.querySelectorAll("main *")]
      .flatMap((element) => [null, "::before", "::after"].map((pseudo) => getComputedStyle(element, pseudo).animationName))
      .filter((name) => name !== "none"));

    expect(animated).toEqual([]);
  });
});
