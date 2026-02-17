import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomePage } from "./HomePage";

describe("HomePage", () => {
  test("renders semantic sections and in-page anchors from HOME_SECTIONS", () => {
    const html = renderToStaticMarkup(createElement(HomePage));

    expect(html).toContain("<main");
    expect(html).toContain("<nav");
    expect(html).toContain("Page sections");

    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`id="${section.id}"`);
      expect(html).toContain(`id="${section.id}-heading"`);
      expect(html).toContain(`aria-labelledby="${section.id}-heading"`);
      expect(html).toContain(`href="#${section.id}"`);
    }
  });

  test("renders hero slogan copy from branding and a discover control to the next section", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("Reboot With Me");
    expect(html).toContain("A new-age way of saying: getting your life back on track.");
    expect(html).toContain("The core principle of the website and project, unfolding in various ways.");
    expect(html).toContain(">Discover<");
    expect(html).toContain('href="#value-pillars"');
  });

  test("renders the for-you carousel with required card titles and navigation controls", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("Mastering Office culture");
    expect(html).toContain("Big Tech independence");
    expect(html).toContain("Elevate your capabilities");
    expect(html).toContain("Meditation Guides");
    expect(html).toContain("Level Up Engineering");
    expect(html).toContain('aria-label="Previous cards"');
    expect(html).toContain('aria-label="Next cards"');
  });

  test("renders the for-you carousel as full-width with responsive card-count classes", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("max-w-none");
    expect(html).toContain("basis-full");
    expect(html).toContain("sm:basis-1/3");
    expect(html).toContain("lg:basis-1/4");
  });
});
