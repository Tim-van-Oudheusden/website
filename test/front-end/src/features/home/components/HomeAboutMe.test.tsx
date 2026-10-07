import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeAboutMe } from "../../../../../../front-end/src/features/home/components/home-about-me";
import type { HomeAboutSection } from "../../../../../../front-end/src/features/home/types/home-section";

const SECTION: HomeAboutSection = {
  id: "about-me",
  label: "about me",
  heading: "About me",
  body: "A short introduction.",
  bgColor: "var(--adw-page-brown-bg)",
  contentDirection: "row",
  variant: "about",
  aboutItems: ["Second item first", "A", "Third, much longer item than the others"],
  imageSrc: "/images/me.png",
  imageAlt: "Portrait of Tim van Oudheusden",
};

function renderAboutMe(): string {
  return renderToStaticMarkup(createElement(HomeAboutMe, { section: SECTION }));
}

describe("HomeAboutMe", () => {
  test("labels the about-me section with its h2", () => {
    const html = renderAboutMe();

    expect(html).toMatch(/<section id="about-me"[^>]*aria-labelledby="about-me-heading"/);
    expect(html).toMatch(/<h2 id="about-me-heading"[^>]*>About me<\/h2>/);
  });

  test("lists every configured item as a list item, in the order written", () => {
    const items = [...renderAboutMe().matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => (match[1] ?? "").replace(/<[^>]+>/g, ""));

    expect(items).toEqual(SECTION.aboutItems);
  });

  test("shows the portrait with its descriptive alt text", () => {
    expect(renderAboutMe()).toMatch(/<img [^>]*src="\/images\/me.png"[^>]*alt="Portrait of Tim van Oudheusden"/);
  });
});
