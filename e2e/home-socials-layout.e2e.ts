import { expect, test } from "@playwright/test";

import { openHome } from "./home-page";

test.describe("Home socials layout", () => {
  for (const width of [1440, 390]) {
    test(`centers the heading, intro, profile links and copyright line in the footer at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openHome(page, { theme: "light", content: [] });

      const footer = page.locator("footer#socials");
      const footerBox = await footer.boundingBox();

      if (footerBox === null) {
        throw new Error("Socials footer is not laid out");
      }

      const blocks = {
        heading: footer.getByRole("heading", { level: 2 }),
        intro: footer.getByRole("paragraph").first(),
        links: footer.getByRole("list"),
        copyright: footer.getByRole("link", { name: /Source of this site/ }).locator(".."),
      };

      for (const [name, block] of Object.entries(blocks)) {
        // The block's rendered content, not its box: block elements span the column whatever their alignment.
        const content = await block.evaluate((element) => {
          const range = document.createRange();

          range.selectNodeContents(element);

          const { left, right } = range.getBoundingClientRect();

          return { left, right };
        });
        const leftGap = content.left - footerBox.x;
        const rightGap = footerBox.x + footerBox.width - content.right;

        expect(Math.abs(leftGap - rightGap), `${name} is centered`).toBeLessThanOrEqual(1);
      }
    });
  }
});
