import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

// A long article from content/: several headings sit far below the fold.
const ARTICLE_PATH = "/articles/my-operating-system-is-a-container-image-yes-really";
const DEEP_HEADING_ID = "bazzite";

interface BlockState {
  /** Opacity the reader sees: the block's own times every ancestor's. */
  opacity: number;
  transform: string;
  translate: string;
  reveal: string | null;
  runningAnimations: number;
}

/** Body blocks (children of the rendered markdown), optionally only those in the viewport. */
async function bodyBlockStates(page: Page, onlyInViewport: boolean): Promise<BlockState[]> {
  return page.evaluate((inViewportOnly) => {
    const blocks = Array.from(document.querySelectorAll("main article .prose > *"));

    return blocks
      .filter((block) => {
        if (!inViewportOnly) {
          return true;
        }

        const rect = block.getBoundingClientRect();

        return rect.bottom > 0 && rect.top < window.innerHeight;
      })
      .map((block) => {
        let opacity = 1;

        for (let node: Element | null = block; node !== null; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }

        const style = getComputedStyle(block);

        return {
          opacity,
          transform: style.transform,
          translate: style.translate,
          reveal: block.getAttribute("data-reveal"),
          runningAnimations: block.getAnimations().length,
        };
      });
  }, onlyInViewport);
}

test.describe("Article motion", () => {
  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows every body block at once, with no hidden state and no animation", async ({ page }) => {
      await page.goto(ARTICLE_PATH, { waitUntil: "networkidle" });
      await expect(page.locator("main article .prose h2").first()).toBeVisible();

      const pageAnimations = await page.evaluate(() => (
        document.querySelector("main article")?.getAnimations({ subtree: true }).length ?? -1
      ));

      expect(pageAnimations).toBe(0);

      const blocks = await bodyBlockStates(page, false);

      expect(blocks.length).toBeGreaterThan(5);

      for (const block of blocks) {
        expect(block).toEqual({ opacity: 1, transform: "none", translate: "none", reveal: null, runningAnimations: 0 });
      }

      // Jump to the end without waiting: whatever lands in view is already visible.
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight);
      });

      for (const block of await bodyBlockStates(page, true)) {
        expect(block.opacity).toBe(1);
      }
    });
  });

  test("a heading deep link shows the target heading and its content right away", async ({ page }) => {
    await page.goto(`${ARTICLE_PATH}#${DEEP_HEADING_ID}`, { waitUntil: "domcontentloaded" });

    const heading = page.locator(`[id="${DEEP_HEADING_ID}"]`);

    await expect(heading).toBeInViewport();

    // Sampled the moment the heading is in view, before any fade could finish.
    const target = await heading.evaluate((element) => {
      function visibleOpacity(start: Element): number {
        let opacity = 1;

        for (let node: Element | null = start; node !== null; node = node.parentElement) {
          opacity *= Number(getComputedStyle(node).opacity);
        }

        return opacity;
      }

      const content = element.nextElementSibling;

      return {
        headingOpacity: visibleOpacity(element),
        contentOpacity: content === null ? null : visibleOpacity(content),
        held: Array.from(document.querySelectorAll("[data-reveal]")).length,
        // The title entrance runs on the article column (the title block's parent).
        entranceAnimations: document.querySelector("main article h1")?.closest("header")?.parentElement?.getAnimations().length ?? -1,
      };
    });

    expect(target).toEqual({ headingOpacity: 1, contentOpacity: 1, held: 0, entranceAnimations: 0 });

    for (const block of await bodyBlockStates(page, true)) {
      expect(block.opacity).toBe(1);
    }
  });

  test("shows every body block on load, at any scroll position, with nothing held back", async ({ page }) => {
    await page.goto(ARTICLE_PATH, { waitUntil: "networkidle" });
    await expect(page.locator("main article .prose h2").first()).toBeVisible();

    // Let the title entrance finish: it fades the whole article column once.
    await page.evaluate(async () => {
      await Promise.all(document.getAnimations().map(async (animation) => animation.finished));
    });

    expect(await page.locator("[data-reveal]").count()).toBe(0);

    for (const block of await bodyBlockStates(page, true)) {
      expect(block.opacity).toBe(1);
    }

    // Jump to the end and sample at once: nothing is waiting to fade in.
    await page.evaluate(() => {
      window.scrollTo(0, document.documentElement.scrollHeight);
    });

    for (const block of await bodyBlockStates(page, true)) {
      expect(block).toMatchObject({ opacity: 1, reveal: null, runningAnimations: 0 });
    }
  });

  test("the title entrance lasts 300ms", async ({ page }) => {
    await page.goto(ARTICLE_PATH, { waitUntil: "domcontentloaded" });
    await expect(page.locator("main article h1")).toBeVisible();

    const durations = await page.locator("main article h1").evaluate((title) => {
      const column = title.closest("header")?.parentElement;

      return column?.getAnimations().map((animation) => animation.effect?.getComputedTiming().duration) ?? [];
    });

    expect(durations).toEqual([300]);
  });
});
