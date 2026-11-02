import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const TRACK = "section[aria-label='How this site is built']";
const STRATA = 6;

/** `data-revealed` of each tablet in the drawn composition, rim first. */
async function tabletStates(page: Page): Promise<(string | null)[]> {
  return page.locator("[data-tablet]").evaluateAll((tablets) => tablets.map((tablet) => tablet.getAttribute("data-revealed")));
}

/** Waits for the lazily loaded scene to draw its tablets. */
async function sceneReady(page: Page): Promise<void> {
  await expect(page.locator("[data-tablet]")).toHaveCount(STRATA);
}

test.describe("Agentic canyon", () => {
  test("reveals no stratum at the top of the track and every stratum at its end", async ({ page }) => {
    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    await sceneReady(page);

    await expect.poll(() => tabletStates(page)).toEqual(Array<string>(STRATA).fill("false"));

    await page.locator(TRACK).evaluate((track) => {
      const rect = track.getBoundingClientRect();

      window.scrollTo(0, window.scrollY + rect.bottom - window.innerHeight);
    });

    await expect.poll(() => tabletStates(page)).toEqual(Array<string>(STRATA).fill("true"));
  });

  test("lands a deep link on its stratum, already revealed", async ({ page }) => {
    await page.goto("/agentic#quality", { waitUntil: "domcontentloaded" });
    await sceneReady(page);

    await expect(page.locator("section#quality").getByRole("heading", { level: 2, name: "Quality" })).toBeInViewport();
    await expect.poll(async () => (await tabletStates(page))[3]).toBe("true");
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows every stratum revealed on load, in a scene that is not pinned", async ({ page }) => {
      await page.goto("/agentic", { waitUntil: "domcontentloaded" });
      await sceneReady(page);

      expect(await tabletStates(page)).toEqual(Array<string>(STRATA).fill("true"));

      const stagePosition = await page.locator(".canyon-scene").evaluate((scene) => (
        scene.parentElement === null ? null : getComputedStyle(scene.parentElement).position
      ));

      expect(stagePosition).not.toBe("sticky");
    });
  });
});
