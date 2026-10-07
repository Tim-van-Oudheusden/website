import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { HomeSection } from "../../../../../../front-end/src/features/home/components/home-section";
import { headingIdFor, HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeSectionDefinition, HomeSectionId } from "../../../../../../front-end/src/features/home/types/home-section";
import { createMemoryContentLoader } from "../../../../../../front-end/src/shared/lib/content-loader";

function findHomeSection(sectionId: HomeSectionId): HomeSectionDefinition {
  const section = HOME_SECTIONS.find((candidateSection) => candidateSection.id === sectionId);

  if (section === undefined) {
    throw new Error(`Expected ${sectionId} section in homepage config`);
  }

  return section;
}

function renderHomeSection(section: HomeSectionDefinition): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(HomeSection, {
        section,
        onCtaActivate: () => undefined,
        loader: createMemoryContentLoader([]),
      }),
    ),
  );
}

function renderSection(sectionId: HomeSectionId): string {
  return renderHomeSection(findHomeSection(sectionId));
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = 0;

  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }

  return count;
}

describe("HomeSection", () => {
  test("renders the start hero with its bottom-right anchored portrait", () => {
    const html = renderSection("start");

    expect(html).toContain('data-testid="start-portrait"');
    expect(html).toContain('src="/images/me.png"');
    expect(html).toMatch(/class="[^"]*absolute right-0 bottom-0/);
  });

  test("renders the start CTA linking to its configured target section", () => {
    const html = renderSection("start");

    expect(html).toContain("Discover");
    expect(html).toContain('href="#for-you"');
  });

  test("declares the hero as an explicit variant, not an id string match", () => {
    expect(findHomeSection("start").variant).toBe("start");
  });

  test("renders each configured section's real heading and body copy", () => {
    for (const section of HOME_SECTIONS) {
      const html = renderSection(section.id);
      // React escapes apostrophes as &#x27; in server markup.
      const text = html.replaceAll("&#x27;", "'");

      expect(text).toContain(section.heading);
      expect(text).toContain(section.body);
    }
  });

  test("renders the footer as a semantic footer with site identification", () => {
    const html = renderSection("footer");

    expect(html).toContain("<footer");
    expect(html).toContain("Reboot With Me");
  });

  test("renders a copyright line in the footer", () => {
    const html = renderSection("footer");

    expect(html).toMatch(/©/);
    expect(html).toContain(String(new Date().getFullYear()));
  });

  test("renders a genuine social link (GitHub) without invented channels", () => {
    const html = renderSection("footer");

    expect(html).toContain("https://github.com/Tim-van-Oudheusden/website");
    expect(html).not.toContain("privacy");
    expect(html).not.toContain("terms");
    expect(html).not.toContain("mastodon");
    expect(html).not.toContain("linkedin");
  });

  test("derives the heading id from the section id via one seam", () => {
    expect(headingIdFor("start")).toBe("start-heading");
    expect(headingIdFor("community-and-docs")).toBe("community-and-docs-heading");
    expect(headingIdFor("footer")).toBe("footer-heading");
  });

  test("renders exactly one frame and one heading per section id", () => {
    for (const section of HOME_SECTIONS) {
      const html = renderSection(section.id);
      const headingId = headingIdFor(section.id);

      expect(countOccurrences(html, `id="${section.id}"`)).toBe(1);
      expect(html).toContain(`aria-labelledby="${headingId}"`);
      expect(countOccurrences(html, `id="${headingId}"`)).toBe(1);
    }
  });
});
