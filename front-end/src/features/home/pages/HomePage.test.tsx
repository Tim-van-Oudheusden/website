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

  test("renders the for-you carousel with 3-up desktop density and portrait card proportions", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("max-w-none");
    expect(html).toContain("basis-full");
    expect(html).toContain("sm:basis-1/3");
    expect(html).toContain("lg:basis-1/3");
    expect(html).toContain("w-3/4");
    expect(html).toContain("aspect-[3/4]");
  });

  test("renders for-you intro in a top-to-bottom centered composition", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("mx-auto flex w-full max-w-none flex-col items-center gap-8");
    expect(html).toContain("max-w-3xl text-center");
  });

  test("adds explicit hover spacing between card title and revealed description text", () => {
    const html = renderToStaticMarkup(createElement(HomePage));
    expect(html).toContain("group-hover:pb-20");
    expect(html).toContain("translate-y-[calc(100%+0.75rem)]");
  });
});
