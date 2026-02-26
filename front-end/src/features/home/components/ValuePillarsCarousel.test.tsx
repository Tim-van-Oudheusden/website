import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolvePagedCarouselScrollLeft, ValuePillarsCarousel } from "./ValuePillarsCarousel";

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

  test("resolves next-page navigation to card-aligned offsets", () => {
    const cardOffsetLefts = [48, 378, 708, 1038, 1368];

    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 0,
      direction: 1,
      cardOffsetLefts,
      viewportWidth: 1000,
      trackPaddingLeft: 48,
    })).toBe(990);

    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 990,
      direction: -1,
      cardOffsetLefts,
      viewportWidth: 1000,
      trackPaddingLeft: 48,
    })).toBe(0);
  });
});
