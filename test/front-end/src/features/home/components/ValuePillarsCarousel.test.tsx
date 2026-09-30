import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolvePagedCarouselScrollLeft, ValuePillarsCarousel } from "../../../../../../front-end/src/features/home/components/value-pillars-carousel";

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

const PAGE_STEP_ARGS = {
  cardOffsetLefts: [48, 378, 708, 1038, 1368],
  viewportWidth: 1000,
  trackPaddingLeft: 48,
};

describe("ValuePillarsCarousel", () => {
  test("renders the intro heading and body copy", () => {
    const html = renderCarousel();

    expect(html).toContain("Test heading");
    expect(html).toContain("Test body");
  });

  test("resolves next-page navigation to card-aligned offsets", () => {
    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 0,
      direction: 1,
      ...PAGE_STEP_ARGS,
    })).toBe(990);

    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 990,
      direction: -1,
      ...PAGE_STEP_ARGS,
    })).toBe(0);
  });

  test("resolves clamped navigation at the first and last pages", () => {
    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 0,
      direction: -1,
      cardOffsetLefts: [48, 378],
      viewportWidth: 1000,
      trackPaddingLeft: 48,
    })).toBe(0);

    expect(resolvePagedCarouselScrollLeft({
      currentScrollLeft: 330,
      direction: 1,
      cardOffsetLefts: [48, 378],
      viewportWidth: 1000,
      trackPaddingLeft: 48,
    })).toBe(330);
  });
});