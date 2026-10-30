import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeAboutMe } from "../../../../../../front-end/src/features/home/components/home-about-me";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeAboutSection } from "../../../../../../front-end/src/features/home/types/home-section";

const SECTION: HomeAboutSection = {
  id: "about-me",
  label: "about me",
  heading: "About me",
  body: "A short introduction.",
  bgColor: "var(--site-page-bg)",
  variant: "about",
  aboutItems: ["Second item first", "A", "Third, much longer item than the others"],
  imageSrc: "/images/me.png",
  imageAlt: "Portrait of Tim van Oudheusden",
};

const LOREM_IPSUM = /\b(?:lorem|ipsum|dolor|amet|consectetur|adipiscing|eiusmod|tempor|incididunt|veniam|nostrud|ullamco)\b/i;

function renderAboutMe(section: HomeAboutSection = SECTION): string {
  return renderToStaticMarkup(createElement(HomeAboutMe, { section }));
}

function configuredAboutSection(): HomeAboutSection {
  const section = HOME_SECTIONS.find((candidate) => candidate.variant === "about");

  if (section?.variant !== "about") {
    throw new Error("HOME_SECTIONS has no about-me section");
  }

  return section;
}

/** Text of an HTML fragment: its text nodes, joined in order. */
function textOf(html: string): string {
  return [...html.matchAll(/(?:^|>)([^<]*)/g)].map((match) => match[1] ?? "").join("");
}

describe("HomeAboutMe", () => {
  test("labels the about-me section with its h2", () => {
    const html = renderAboutMe();

    expect(html).toMatch(/<section id="about-me"[^>]*aria-labelledby="about-me-heading"/);
    expect(html).toMatch(/<h2 id="about-me-heading"[^>]*>About me<\/h2>/);
  });

  test("lists every configured item as a list item, in the order written", () => {
    const items = [...renderAboutMe().matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => textOf(match[1] ?? ""));

    expect(items).toEqual(SECTION.aboutItems);
  });

  test("shows the portrait with its descriptive alt text", () => {
    expect(renderAboutMe()).toMatch(/<img [^>]*src="\/images\/me.png"[^>]*alt="Portrait of Tim van Oudheusden"/);
  });

  test("shows the configured intro and bricks as real copy, without placeholder lorem ipsum", () => {
    const html = renderAboutMe(configuredAboutSection());
    const intro = textOf(/<p[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "");
    const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => textOf(match[1] ?? ""));

    expect(intro).not.toBe("");
    expect(items.length).toBeGreaterThan(0);
    expect([intro, ...items].filter((text) => LOREM_IPSUM.test(text))).toEqual([]);
  });
});
