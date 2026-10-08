import type { Page, Response } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { CF_CONNECTING_IP_HEADER } from "../shared/src/index";

// Both articles come from content/; the beacon is only counted for slugs that
// exist there, so a 204 proves the request crossed the dev proxy and reached
// the back-end's view store.
const OPENED_SLUG = "my-operating-system-is-a-container-image-yes-really";
const NEXT_TITLE = "Apt-get out of my life, hello flatpak";
const NEXT_SLUG = "apt-get-out-of-my-life-hello-flatpak";

function waitForViewBeacon(page: Page, slug: string): Promise<Response> {
  return page.waitForResponse((response) => (
    response.request().method() === "POST"
    && new URL(response.url()).pathname === `/api/views/${slug}`
  ));
}

test.describe("Article view beacon", () => {
  // The back-end allows 50 requests a minute per visitor, and every other spec shares the loopback
  // visitor (see home-page.ts). Behind the dev proxy the peer is loopback, so the rate limiter keys on
  // this header, as it does for each real visitor behind Cloudflare: these tests get a budget of their
  // own instead of spending the shared one. 192.0.2.0/24 is reserved for documentation (RFC 5737).
  test.use({ extraHTTPHeaders: { [CF_CONNECTING_IP_HEADER]: "192.0.2.1" } });

  test("opening an article records a view for its slug", async ({ page }) => {
    const beacon = waitForViewBeacon(page, OPENED_SLUG);

    await page.goto(`/articles/${OPENED_SLUG}`, { waitUntil: "domcontentloaded" });

    expect((await beacon).status()).toBe(204);
  });

  test("switching articles in the sidebar records a view for the new slug", async ({ page }) => {
    const firstBeacon = waitForViewBeacon(page, OPENED_SLUG);

    await page.goto(`/articles/${OPENED_SLUG}`, { waitUntil: "domcontentloaded" });
    await firstBeacon;

    const nextBeacon = waitForViewBeacon(page, NEXT_SLUG);

    await page.locator("main > aside").getByRole("link", { name: NEXT_TITLE }).click();

    await expect(page).toHaveURL(new RegExp(`/articles/${NEXT_SLUG}$`));
    expect((await nextBeacon).status()).toBe(204);
  });

  test("the back-end refuses to count a slug that is not in content/", async ({ request }) => {
    const response = await request.post("/api/views/no-such-article");

    expect(response.status()).toBe(404);
  });
});
