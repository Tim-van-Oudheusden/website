import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { openHome } from "./home-page";

/**
 * Opens the home page at the agentic teaser, with its stylesheet applied: without the stylesheet
 * nothing animates, and a count of zero would prove nothing.
 */
async function openTeaser(page: Page): Promise<void> {
  await openHome(page, { theme: "light", content: [] });

  const cta = page.locator("section#agentic .ha-cta");

  await cta.scrollIntoViewIfNeeded();
  await expect(cta).toHaveCSS("border-radius", "999px");
}

/**
 * The teaser's running keyframe animations. Most of them are on `::after` boxes, so this asks the
 * document: `document.getAnimations()` lists those under the element they belong to, an element's
 * own `getAnimations()` does not.
 */
async function teaserAnimations(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation)
      .filter((animation) => {
        const { effect } = animation;

        return effect instanceof KeyframeEffect && (effect.target?.closest(".home-agentic") ?? null) !== null;
      })
      .map((animation) => animation.animationName),
  );
}

test.describe("Home agentic teaser motion", () => {
  test("runs the conduit, node, honeycomb and live animations by default", async ({ page }) => {
    await openTeaser(page);

    expect(new Set(await teaserAnimations(page))).toEqual(new Set(["ha-flow-x", "ha-breathe", "ha-cell", "ha-ping"]));
  });

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("runs no animation", async ({ page }) => {
      await openTeaser(page);

      expect(await teaserAnimations(page)).toEqual([]);
    });
  });
});
