import { expect, test } from "@playwright/test";

interface SidebarLayoutSnapshot {
  sidebarWidth: number;
  expectedSidebarWidth: number;
  minimumReadableSidebarWidth: number;
  contentPaddingRight: number;
  expectedContentPaddingRight: number;
}

test.describe("Articles sidebar layout", () => {
  test("applies widened desktop sidebar width with matching content-to-TOC compensation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/articles", { waitUntil: "domcontentloaded" });

    await expect(page.locator("main > aside").first()).toBeVisible();
    await expect(page.locator("main article aside").first()).toBeVisible();

    const snapshot = await page.evaluate((): SidebarLayoutSnapshot | null => {
      function createCssVarProbe(varName: string): HTMLDivElement {
        const probe = document.createElement("div");

        probe.style.position = "absolute";
        probe.style.visibility = "hidden";
        probe.style.pointerEvents = "none";
        probe.style.width = `var(${varName})`;
        probe.style.height = "0";
        probe.style.overflow = "hidden";

        return probe;
      }

      const sidebar = document.querySelector("main > aside");
      const contentWithToc = document.querySelector("main article > div");
      const toc = document.querySelector("main article aside");

      if (sidebar === null || contentWithToc === null || toc === null) {
        return null;
      }

      const sidebarProbe = createCssVarProbe("--articles-sidebar-width");
      const gapProbe = createCssVarProbe("--articles-content-toc-gap");

      document.body.append(sidebarProbe, gapProbe);

      const expectedSidebarWidth = Number.parseFloat(getComputedStyle(sidebarProbe).width);
      const expectedContentTocGap = Number.parseFloat(getComputedStyle(gapProbe).width);

      sidebarProbe.remove();
      gapProbe.remove();

      const sidebarRect = sidebar.getBoundingClientRect();
      const contentStyles = getComputedStyle(contentWithToc);
      const contentPaddingRight = Number.parseFloat(contentStyles.paddingRight);

      return {
        sidebarWidth: sidebarRect.width,
        expectedSidebarWidth,
        minimumReadableSidebarWidth: 360,
        contentPaddingRight,
        expectedContentPaddingRight: expectedContentTocGap,
      };
    });

    if (snapshot === null) {
      throw new Error("Expected articles sidebar layout elements to be present");
    }

    const snapshotTyped = snapshot;

    expect(snapshotTyped.sidebarWidth).toBeDefined();
    expect(snapshotTyped.expectedSidebarWidth).toBeDefined();
    expect(Math.abs(snapshotTyped.sidebarWidth - snapshotTyped.expectedSidebarWidth)).toBeLessThanOrEqual(2);
    expect(snapshotTyped.sidebarWidth).toBeGreaterThanOrEqual(snapshotTyped.minimumReadableSidebarWidth);
    expect(snapshotTyped.contentPaddingRight).toBeDefined();
    expect(snapshotTyped.expectedContentPaddingRight).toBeDefined();

    expect(Math.abs(snapshotTyped.contentPaddingRight - snapshotTyped.expectedContentPaddingRight))
      .toBeLessThanOrEqual(4);
  });
});
