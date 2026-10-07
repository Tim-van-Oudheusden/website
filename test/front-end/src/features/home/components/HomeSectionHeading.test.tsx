import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { HomeSectionHeading } from "../../../../../../front-end/src/features/home/components/home-section-heading";

function renderHeading(): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(HomeSectionHeading, {
        headingId: "for-you-heading",
        heading: "For you",
        subheading: "Picked from the blog, especially for you.",
        linkLabel: "See all articles",
        linkTo: "/articles",
      }),
    ),
  );
}

describe("HomeSectionHeading", () => {
  test("labels the section with an h2 and links onward under the visible label", () => {
    const html = renderHeading();

    expect(html).toMatch(/<h2 id="for-you-heading"[^>]*>For you<\/h2>/);
    expect(html).toContain("Picked from the blog, especially for you.");
    expect(html).toMatch(/<a [^>]*href="\/articles"[^>]*>[\s\S]*See all articles[\s\S]*<\/a>/);
  });
});
