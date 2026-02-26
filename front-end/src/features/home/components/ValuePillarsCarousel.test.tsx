import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ValuePillarsCarousel } from "./ValuePillarsCarousel";

function renderCarousel(): string {
  return renderToStaticMarkup(
    createElement(ValuePillarsCarousel, {
      headingId: "test-heading",
      heading: "Test heading",
      body: "Test body",
      inWhiteWell: true,
    }),
  );
}

describe("ValuePillarsCarousel", () => {
  test("uses variable description reveal height instead of fixed hover padding", () => {
    const html = renderCarousel();

    expect(html).toContain("group-hover:max-h-[var(--value-pillar-description-height)]");
    expect(html).toContain("overflow-hidden max-h-0");
    expect(html).not.toContain("group-hover:pb-18");
    expect(html).not.toContain("translate-y-[calc(100%+0.75rem)]");
  });
});
