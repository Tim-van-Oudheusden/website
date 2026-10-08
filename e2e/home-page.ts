import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

interface OpenHomeOptions {
  theme: "light" | "dark";
  /** Content types the test reads; every other back-end request is aborted. */
  content: ("article" | "project")[];
}

/**
 * Opens the home page in a theme. Only the content a test reads reaches the back-end, so a test never
 * depends on content it does not check; content images never do.
 */
export async function openHome(page: Page, { theme, content }: OpenHomeOptions): Promise<void> {
  await page.route(
    (url) => url.pathname.startsWith("/api/") || url.pathname.startsWith("/content-assets/"),
    async (route) => {
      const type = new URL(route.request().url()).searchParams.get("type");

      await (content.some((allowed) => allowed === type) ? route.continue() : route.abort());
    },
  );

  await page.addInitScript((storedTheme) => {
    localStorage.setItem("theme", storedTheme);
  }, theme);

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const html = expect(page.locator("html"));

  await (theme === "dark" ? html.toHaveClass(/\bdark\b/) : html.not.toHaveClass(/\bdark\b/));
}
