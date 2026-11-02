import type { HiveMetricsResponse } from "../shared/src/index";

import { expect, test } from "./fixtures";

// The dev pod runs without HIVE_BASE_URL, so GET /api/hive/metrics serves DEV_HIVE_METRICS.
const STATIONS = ["Queue", "Agents", "Runs", "Pull requests", "Merged"];

test.describe("Agentic page", () => {
  test("draws every station and chart from the dev fixture", async ({ page }) => {
    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    const main = page.getByRole("main");

    await expect(main.getByRole("heading", { level: 1, name: "Agentic" })).toBeVisible();
    await expect(main.getByRole("heading", { level: 2, name: "The hive, live" })).toBeVisible();
    await expect(main.getByRole("heading", { level: 3 })).toHaveText(STATIONS);

    const charts = main.getByRole("img");

    await expect(charts.first()).toBeVisible();
    // Each chart is an ECharts canvas inside its named image.
    await expect.poll(async () => main.locator("[role='img'] canvas").count()).toBe(await charts.count());
  });

  test("explains instead of drawing empty charts when the metrics are unavailable", async ({ page }) => {
    await page.route((url) => url.pathname === "/api/hive/metrics", async (route) => {
      const body: HiveMetricsResponse = { state: "unavailable", fetchedAt: null, metrics: null };

      await route.fulfill({ json: body });
    });

    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    const main = page.getByRole("main");

    await expect(main.getByText("The live numbers are not available right now")).toBeVisible();
    await expect(main.getByText("Offline", { exact: true })).toBeVisible();
    await expect(main.getByRole("heading", { level: 3 })).toHaveCount(0);
    await expect(main.getByRole("img")).toHaveCount(0);
  });

  test("shows the page through the top bar, which keeps its background on other pages", async ({ page }) => {
    async function background(): Promise<string> {
      return page.locator("header").first().evaluate((header) => getComputedStyle(header).backgroundColor);
    }

    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    await expect.poll(background).toBe("rgba(0, 0, 0, 0)");

    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect.poll(background).not.toBe("rgba(0, 0, 0, 0)");
  });
});
