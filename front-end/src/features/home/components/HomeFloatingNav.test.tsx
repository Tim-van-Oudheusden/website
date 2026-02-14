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

  test("uses updated section labels and larger translucent navbar styling", () => {
    const html = renderNav();

    expect(html).toContain("pb-8");
    expect(html).toContain("bg-background/60");
    expect(html).toContain("border-[var(--adw-light-4)]");
    expect(html).toContain("px-4");
    expect(html).toContain("py-2");
    expect(html).toContain("uppercase");
    expect(html).toContain("text-base");

    const labels = ["home", "for you", "for devs", "conquer", "strengthen", "independence", "inner peace"];
    let previousIndex = -1;
    for (const label of labels) {
      const currentIndex = html.indexOf(`>${label}<`);
      expect(currentIndex).toBeGreaterThan(previousIndex);
      previousIndex = currentIndex;
    }
  });

  test("renders set-1 lucide icons for all navbar sections", () => {
    const html = renderNav();

    const iconClassNames = [
      "lucide-house",
      "lucide-user-round",
      "lucide-code-xml",
      "lucide-trophy",
      "lucide-dumbbell",
      "lucide-shield-check",
      "lucide-sparkles",
    ];

    for (const iconClassName of iconClassNames) {
      expect(html).toContain(iconClassName);
    }
  });
});
