import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

async function getTocLinkViewportDiagnostics(page: Page, headingId: string): Promise<{
  linkColor: string | null;
  inactiveColor: string;
  normalColor: string;
  headingInViewport: boolean;
  headingAboveViewport: boolean;
  headingBelowViewport: boolean;
}> {
  return page.evaluate((id) => {
    const heading = document.getElementById(id);
    const tocLink = document.querySelector(`nav[aria-label="Table of contents"] a[href="#${id}"]`);

    function resolveColorValue(value: string): string {
      const probe = document.createElement("span");
      probe.style.color = value;
      document.body.append(probe);
      const resolved = getComputedStyle(probe).color;
      probe.remove();
      return resolved;
    }

    let headingInViewport = false;
    let headingAboveViewport = false;
    let headingBelowViewport = false;
    if (heading != null) {
      const rect = heading.getBoundingClientRect();
      headingInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      headingAboveViewport = rect.bottom <= 0;
      headingBelowViewport = rect.top >= window.innerHeight;
    }

    return {
      linkColor: tocLink == null ? null : getComputedStyle(tocLink).color,
      inactiveColor: resolveColorValue("var(--adw-toc-inactive)"),
      normalColor: resolveColorValue("var(--adw-dark-4)"),
      headingInViewport,
      headingAboveViewport,
      headingBelowViewport,
    };
  }, headingId);
}

test.describe("Articles TOC navigation", () => {
  test("renders the articles page with a visible TOC", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Table of contents" })).toBeVisible();
  });

  test("keeps TOC ids aligned with rendered heading ids at runtime", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Table of contents" })).toBeVisible();

    const diagnostics = await page.evaluate(() => {
      const tocNav = document.querySelector('nav[aria-label="Table of contents"]');
      const tocIds = tocNav == null
        ? []
        : Array.from(tocNav.querySelectorAll('a[href^="#"]'))
          .map((link) => (link.getAttribute("href") ?? "").slice(1))
          .filter((id) => id.length > 0);

      const headingIds = Array
        .from(document.querySelectorAll("article h1[id], article h2[id], article h3[id]"))
        .map((heading) => heading.id);

      const missingTocIds = tocIds.filter((tocId) => !headingIds.includes(tocId));
      const shiftedMatches = missingTocIds.filter((tocId) => headingIds.includes(`${tocId}-1`));

      return {
        tocIds,
        headingIds,
        missingTocIds,
        shiftedMatches,
      };
    });

    expect(diagnostics.tocIds.length).toBeGreaterThan(0);
    expect(diagnostics.missingTocIds).toEqual([]);
    expect(diagnostics.shiftedMatches).toEqual([]);
  });

  test("navigates to an existing heading target when a TOC item is clicked", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });

    const tableOfContents = page.getByRole("navigation", { name: "Table of contents" });
    await expect(tableOfContents).toBeVisible();

    const tocLinks = tableOfContents.getByRole("link");
    const tocLinkCount = await tocLinks.count();
    expect(tocLinkCount).toBeGreaterThan(0);

    const targetLink = tocLinks.nth(tocLinkCount > 1 ? 1 : 0);
    const targetHref = await targetLink.getAttribute("href");
    expect(targetHref).not.toBeNull();
    expect(targetHref).toMatch(/^#.+/);

    const targetHeadingId = (targetHref as string).slice(1);

    await targetLink.click();

    await expect(page).toHaveURL(new RegExp(`#${targetHeadingId}$`));

    const clickDiagnostics = await page.evaluate((clickedId) => {
      const targetByHash = document.getElementById(clickedId);
      const headingIds = Array
        .from(document.querySelectorAll("article h1[id], article h2[id], article h3[id]"))
        .map((heading) => heading.id);

      return {
        targetByHashExists: targetByHash != null,
        shiftedIdExists: headingIds.includes(`${clickedId}-1`),
        headingIds,
      };
    }, targetHeadingId);

    expect(clickDiagnostics.targetByHashExists).toBe(true);
    expect(clickDiagnostics.shiftedIdExists).toBe(false);
  });

  test("keeps passed headings active when scrolling down and re-greys headings that leave via bottom while scrolling up", async ({ page }) => {
    await page.goto("/articles", { waitUntil: "domcontentloaded" });
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.getByRole("button", { name: /Apt-get out of my life, hello flatpak/i }).click();

    const tableOfContents = page.getByRole("navigation", { name: "Table of contents" });
    await expect(tableOfContents).toBeVisible();
    await expect(tableOfContents.getByRole("link", { name: /A closing note/i })).toBeVisible();
    await page.evaluate(() => { window.scrollTo({ top: 0, behavior: "instant" }); });

    const headingIds = await page.evaluate(() => Array
      .from(document.querySelectorAll('nav[aria-label="Table of contents"] a[href^="#"]'))
      .map((link) => (link.getAttribute("href") ?? "").slice(1))
      .filter((id) => id.length > 0));
    expect(headingIds.length).toBeGreaterThan(2);

    const firstHeadingId = headingIds[0] as string;
    const middleHeadingId = headingIds[Math.floor(headingIds.length / 2)] as string;
    const lastHeadingId = headingIds[headingIds.length - 1] as string;

    await page.locator(`article #${middleHeadingId}`).scrollIntoViewIfNeeded();

    await expect.poll(
      async () => getTocLinkViewportDiagnostics(page, middleHeadingId),
      { timeout: 5_000 },
    ).toMatchObject({ headingInViewport: true });

    const expectedMiddleNormalColor = (await getTocLinkViewportDiagnostics(page, middleHeadingId)).normalColor;
    await expect.poll(
      async () => (await getTocLinkViewportDiagnostics(page, middleHeadingId)).linkColor,
      { timeout: 5_000 },
    ).toBe(expectedMiddleNormalColor);

    await page.locator(`article #${lastHeadingId}`).scrollIntoViewIfNeeded();

    await expect.poll(
      async () => getTocLinkViewportDiagnostics(page, middleHeadingId),
      { timeout: 5_000 },
    ).toMatchObject({ headingAboveViewport: true });

    const middleDiagnosticsAfterScrollDown = await getTocLinkViewportDiagnostics(page, middleHeadingId);
    expect(middleDiagnosticsAfterScrollDown.linkColor).toBe(middleDiagnosticsAfterScrollDown.normalColor);

    await expect.poll(
      async () => getTocLinkViewportDiagnostics(page, lastHeadingId),
      { timeout: 5_000 },
    ).toMatchObject({ headingInViewport: true });

    const expectedLastNormalColor = (await getTocLinkViewportDiagnostics(page, lastHeadingId)).normalColor;
    await expect.poll(
      async () => (await getTocLinkViewportDiagnostics(page, lastHeadingId)).linkColor,
      { timeout: 5_000 },
    ).toBe(expectedLastNormalColor);

    await page.locator(`article #${firstHeadingId}`).scrollIntoViewIfNeeded();

    await expect.poll(
      async () => getTocLinkViewportDiagnostics(page, lastHeadingId),
      { timeout: 5_000 },
    ).toMatchObject({ headingBelowViewport: true });

    const expectedLastInactiveColor = (await getTocLinkViewportDiagnostics(page, lastHeadingId)).inactiveColor;
    await expect.poll(
      async () => (await getTocLinkViewportDiagnostics(page, lastHeadingId)).linkColor,
      { timeout: 5_000 },
    ).toBe(expectedLastInactiveColor);

    const firstDiagnosticsAfterScrollUp = await getTocLinkViewportDiagnostics(page, firstHeadingId);
    expect(firstDiagnosticsAfterScrollUp.linkColor).toBe(firstDiagnosticsAfterScrollUp.normalColor);

    const offscreenHeadingId = await page.evaluate(() => {
      const tocLinks = Array.from(document.querySelectorAll('nav[aria-label="Table of contents"] a[href^="#"]'));
      for (const tocLink of tocLinks) {
        const headingId = (tocLink.getAttribute("href") ?? "").slice(1);
        if (headingId.length === 0) {
          continue;
        }

        const heading = document.getElementById(headingId);
        if (heading == null) {
          continue;
        }

        const rect = heading.getBoundingClientRect();
        const headingInViewport = rect.top < window.innerHeight && rect.bottom > 0;
        if (!headingInViewport) {
          return headingId;
        }
      }

      return null;
    });
    expect(offscreenHeadingId).not.toBeNull();

    const beforeDiagnostics = await getTocLinkViewportDiagnostics(page, offscreenHeadingId as string);
    expect(beforeDiagnostics.headingInViewport).toBe(false);
    expect(beforeDiagnostics.linkColor).toBe(beforeDiagnostics.inactiveColor);
  });
});
