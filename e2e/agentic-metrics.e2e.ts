import { DEV_HIVE_METRICS } from "../back-end/src/features/hive/hive-metrics-dev-fixture";
import type { HiveMetricsResponse } from "../shared/src/index";

import { expect, test } from "./fixtures";

// The dev pod runs without HIVE_BASE_URL, so GET /api/hive/metrics serves DEV_HIVE_METRICS.
// Figures: queue, governor mode, contributor tasks, one run row per backend, PRs per day and who wrote them.
const DEV_FIGURES = 5 + (DEV_HIVE_METRICS.contributors?.runs7d.backends.length ?? 0);

test.describe("Agentic metrics section", () => {
  test("shows the four tiles and every chart from the dev fixture", async ({ page }) => {
    await page.goto("/agentic#metrics", { waitUntil: "domcontentloaded" });
    const section = page.locator("section#metrics");

    await expect(section.getByRole("heading", { level: 2, name: "The hive, live" })).toBeVisible();
    await expect(section.getByRole("list", { name: "Hive right now" }).getByRole("listitem")).toHaveCount(4);
    await expect(section.locator("figure")).toHaveCount(DEV_FIGURES);
    await expect(section.getByRole("img")).toHaveCount(DEV_FIGURES);
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
