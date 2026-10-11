import type { Locator } from "@playwright/test";

import { expect, test } from "./fixtures";

interface ProseRole {
  /** First match inside the prose root. */
  selector: string;
  /** The site token the role must compute to. */
  token: string;
  /** Read the colour of this pseudo-element of the match instead of the match itself. */
  pseudoElement: "::marker" | null;
}

interface RoleColours {
  actual: Record<string, string>;
  expected: Record<string, string>;
}

/** Each role's computed colour next to the computed colour of its token, so a mismatch shows both. */
async function proseRoleColours(prose: Locator, roles: Record<string, ProseRole>): Promise<RoleColours> {
  return prose.evaluate((root, proseRoles) => {
    function tokenColour(token: string): string {
      const probe = document.createElement("span");

      probe.style.color = `var(${token})`;
      root.append(probe);

      const colour = getComputedStyle(probe).color;

      probe.remove();

      return colour;
    }

    const actual: Record<string, string> = {};
    const expected: Record<string, string> = {};

    for (const [role, { pseudoElement, selector, token }] of Object.entries(proseRoles)) {
      const element = root.querySelector(selector);

      actual[role] = element === null ? `no ${selector}` : getComputedStyle(element, pseudoElement).color;
      expected[role] = tokenColour(token);
    }

    return { actual, expected };
  }, roles);
}

test.describe("Light-mode prose colours", () => {
  test.beforeEach(async ({ page }) => {
    // Images never change a computed text colour; skip them.
    await page.route((url) => url.pathname.startsWith("/content-assets/"), async (route) => route.abort());

    await page.addInitScript(() => {
      localStorage.setItem("theme", "light");
    });
  });

  test("article prose uses the site's text, heading, link and bold colours, not Typography's greys", async ({ page }) => {
    await page.goto("/articles/my-operating-system-is-a-container-image-yes-really", { waitUntil: "domcontentloaded" });

    const prose = page.locator("main article .prose");

    await expect(prose.getByRole("heading", { level: 2 }).first()).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    const { actual, expected } = await proseRoleColours(prose, {
      body: { selector: ":scope > p", token: "--foreground", pseudoElement: null },
      heading: { selector: "h2", token: "--foreground", pseudoElement: null },
      subheading: { selector: "h3", token: "--foreground", pseudoElement: null },
      link: { selector: "p a", token: "--site-accent", pseudoElement: null },
      bold: { selector: "strong", token: "--foreground", pseudoElement: null },
      inlineCode: { selector: ":not(pre) > code", token: "--foreground", pseudoElement: null },
    });

    expect(actual).toEqual(expected);
  });

  test("standalone page prose uses the site's text and link colours, and the muted colour for bullets", async ({ page }) => {
    await page.goto("/uses", { waitUntil: "domcontentloaded" });

    const prose = page.locator("main article .prose");

    await expect(prose.locator("ul").first()).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);

    const { actual, expected } = await proseRoleColours(prose, {
      bullet: { selector: "ul > li", token: "--muted-foreground", pseudoElement: "::marker" },
      listText: { selector: "ul > li", token: "--foreground", pseudoElement: null },
      link: { selector: "li a", token: "--site-accent", pseudoElement: null },
    });

    expect(actual).toEqual(expected);
  });
});
