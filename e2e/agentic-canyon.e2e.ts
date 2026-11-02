import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

const TRACK = "section[aria-label='How this site is built']";
const STRATA = 6;

interface CardState {
  top: number;
  bottom: number;
  /** Opacity the reader sees: the card's own times every ancestor's. */
  opacity: number;
}

/** `data-revealed` of each tablet in the drawn composition, rim first. */
async function tabletStates(page: Page): Promise<(string | null)[]> {
  return page.locator("[data-tablet]").evaluateAll((tablets) => tablets.map((tablet) => tablet.getAttribute("data-revealed")));
}

/** Waits for the lazily loaded scene to draw its tablets. */
async function sceneReady(page: Page): Promise<void> {
  await expect(page.locator("[data-tablet]")).toHaveCount(STRATA);
}

/** Scrolls so the reader is `share` (0 to 1) of the way through the track. */
async function scrollTrackTo(page: Page, share: number): Promise<void> {
  await page.locator(TRACK).evaluate((track, at) => {
    const rect = track.getBoundingClientRect();

    window.scrollTo(0, window.scrollY + rect.top + (rect.height - window.innerHeight) * at);
  }, share);
}

/** Where a stratum card sits on screen and how visible it is. */
async function cardState(page: Page, id: string): Promise<CardState> {
  return page.locator(`section#${id}`).evaluate((card) => {
    const rect = card.getBoundingClientRect();
    let opacity = 1;

    for (let node: Element | null = card; node !== null; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }

    return { top: rect.top, bottom: rect.bottom, opacity };
  });
}

test.describe("Agentic canyon", () => {
  test("reveals no stratum at the top of the track and every stratum at its end", async ({ page }) => {
    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    await sceneReady(page);

    await expect.poll(() => tabletStates(page)).toEqual(Array<string>(STRATA).fill("false"));

    await scrollTrackTo(page, 1);

    await expect.poll(() => tabletStates(page)).toEqual(Array<string>(STRATA).fill("true"));
  });

  test("fades the night sky into the page at the end of the track, where the metrics section begins", async ({ page }) => {
    await page.goto("/agentic", { waitUntil: "domcontentloaded" });
    await sceneReady(page);

    async function fadeOpacity(): Promise<number> {
      return page.locator("[data-night-fade]").evaluate((fade) => Number(getComputedStyle(fade).opacity));
    }

    await expect.poll(fadeOpacity).toBe(0);

    await scrollTrackTo(page, 1);

    await expect.poll(fadeOpacity).toBe(1);

    const overlap = await page.evaluate(() => {
      const track = document.querySelector("section[aria-label='How this site is built']")?.getBoundingClientRect();
      const metrics = document.getElementById("metrics")?.getBoundingClientRect();

      return track === undefined || metrics === undefined ? null : track.bottom - metrics.top;
    });

    // The section's first row sits inside the fade's solid end, not after a hard edge.
    expect(overlap).toBeGreaterThan(0);
  });

  test("lands a deep link on its stratum, already revealed", async ({ page }) => {
    await page.goto("/agentic#quality", { waitUntil: "domcontentloaded" });
    await sceneReady(page);

    await expect(page.locator("section#quality").getByRole("heading", { level: 2, name: "Quality" })).toBeInViewport();
    await expect.poll(async () => (await tabletStates(page))[3]).toBe("true");
  });

  test.describe("on a phone", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps the current stratum's card in the bottom third and clears the passed ones", async ({ page }) => {
      await page.goto("/agentic", { waitUntil: "domcontentloaded" });
      await sceneReady(page);

      // 70 % down the track: four strata revealed, Quality the latest, its card slid in and pinned.
      await scrollTrackTo(page, 0.7);
      await expect.poll(() => tabletStates(page)).toEqual(["true", "true", "true", "true", "false", "false"]);

      const viewport = await page.evaluate(() => window.innerHeight);
      const quality = await cardState(page, "quality");

      // Pinned 12 px above the bottom; the tallest card may reach a little above the two-thirds line.
      expect(quality.top).toBeGreaterThanOrEqual(viewport * 2 / 3 - 24);
      expect(quality.bottom).toBeLessThanOrEqual(viewport);
      expect(quality.opacity).toBe(1);
      await expect.poll(async () => (await cardState(page, "api")).opacity).toBe(0);
    });
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
