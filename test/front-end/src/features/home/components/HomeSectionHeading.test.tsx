import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { HomeSectionHeading } from "../../../../../../front-end/src/features/home/components/home-section-heading";

function renderHeading(link: { label: string; to: string } | null): string {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(HomeSectionHeading, {
        headingId: "for-you-heading",
        heading: "For you",
        subheading: "Picked from the blog, especially for you.",
        link,
        align: "start",
      }),
    ),
  );
}

describe("HomeSectionHeading", () => {
  test("labels the section with an h2 and links onward under the visible label", () => {
    const html = renderHeading({ label: "See all articles", to: "/articles" });

    expect(html).toMatch(/<h2 id="for-you-heading"[^>]*>For you<\/h2>/);
    expect(html).toContain("Picked from the blog, especially for you.");
    expect(html).toMatch(/<a [^>]*href="\/articles"[^>]*>[\s\S]*See all articles[\s\S]*<\/a>/);
  });

  test("draws the hover ring around the arrow within the 300ms hover budget", () => {
    const ring = /<circle [^>]*stroke-dasharray="175.93"[^>]*class="([^"]*)"/.exec(renderHeading({ label: "See all articles", to: "/articles" }))?.[1]?.split(" ") ?? [];

    expect(ring).toContain("transition-[stroke-dashoffset]");
    expect(ring).toContain("duration-300");
    expect(ring).not.toContain("duration-500");
  });

  test("renders no link for a section without one", () => {
    const html = renderHeading(null);

    expect(html).toMatch(/<h2 id="for-you-heading"[^>]*>For you<\/h2>/);
    expect(html).not.toContain("<a ");
  });
});
