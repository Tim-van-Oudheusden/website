import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeFloatingNav } from "./HomeFloatingNav";
import { HOME_SECTIONS } from "../config/home-sections";
import type { HomeSectionId } from "../types/home-section";

function renderNav(activeSectionId: HomeSectionId = "hero"): string {
  return renderToStaticMarkup(
    createElement(HomeFloatingNav, {
      sections: HOME_SECTIONS,
      activeSectionId,
      onAnchorActivate: () => { /* noop for test */ },
    }),
  );
}

describe("HomeFloatingNav", () => {
  test("renders a fixed bottom nav element", () => {
    const html = renderNav();
    expect(html).toContain("<nav");
    expect(html).toContain("fixed");
    expect(html).toContain("bottom-0");
  });

  test("renders an anchor for every section", () => {
    const html = renderNav();
    for (const section of HOME_SECTIONS) {
      expect(html).toContain(`href="#${section.id}"`);
    }
  });

  test("marks the active section with aria-current", () => {
    const html = renderNav("feature-strips");
    expect(html).toContain('aria-current="location"');
    const anchorPattern = `href="#feature-strips"`;
    const anchorIndex = html.indexOf(anchorPattern);
    const ariaCurrentIndex = html.indexOf('aria-current="location"');
    const nextAnchorIndex = html.indexOf('href="#', anchorIndex + 1);
    expect(ariaCurrentIndex).toBeGreaterThan(anchorIndex);
    if (nextAnchorIndex !== -1) {
      expect(ariaCurrentIndex).toBeLessThan(nextAnchorIndex);
    }
  });

  test("has accessible nav label", () => {
    const html = renderNav();
    expect(html).toContain('aria-label=');
  });

  test("uses shadcn Badge component for nav items", () => {
    const html = renderNav();
    expect(html).toContain('data-slot="badge"');
  });
});
