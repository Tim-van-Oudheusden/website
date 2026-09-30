import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HomeTrustStrip } from "../../../../../../front-end/src/features/home/components/HomeTrustStrip";

const FIXTURE_ITEMS = [
  "Open source, from the repo to the content",
  "Self-hosted and independent of Big Tech",
  "Linux-native on a container-OS desktop",
];

function renderTrustStrip(items = FIXTURE_ITEMS): string {
  return renderToStaticMarkup(
    createElement(HomeTrustStrip, {
      sectionId: "proof",
      headingId: "proof-heading",
      heading: "Proof through honesty",
      body: "The site states only what is true.",
      bgColor: "var(--adw-page-brown-bg)",
      items,
    }),
  );
}

describe("HomeTrustStrip", () => {
  test("renders a section with the heading, intro body, and each honest claim", () => {
    const html = renderTrustStrip();

    expect(html).toContain("Proof through honesty");
    expect(html).toContain("The site states only what is true.");
    for (const item of FIXTURE_ITEMS) {
      expect(html).toContain(item);
    }
  });

  test("wraps the strip in a semantic section labelled by its heading", () => {
    const html = renderTrustStrip();

    expect(html).toContain('<section id="proof"');
    expect(html).toContain('aria-labelledby="proof-heading"');
  });

  test("uses a centered column layout for the claims", () => {
    const html = renderTrustStrip();

    expect(html).toContain("flex-col");
    expect(html).toContain("items-center");
    expect(html).not.toContain("md:flex-row");
  });

  test("renders no fabricated metrics, testimonials, or compatibility claims", () => {
    const html = renderTrustStrip();

    expect(html).not.toMatch(/[0-9]%/);
    expect(html).not.toMatch(/readers?/i);
    expect(html).not.toMatch(/downloads?/i);
    expect(html).not.toMatch(/testimon/i);
    expect(html).not.toMatch(/compatib/i);
    expect(html).not.toMatch(/users/i);
  });
});