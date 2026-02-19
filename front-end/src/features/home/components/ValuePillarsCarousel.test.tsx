import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ValuePillarsCarousel, calculateCardTiltAngles } from "./ValuePillarsCarousel";

describe("calculateCardTiltAngles", () => {
  test("returns zero rotation when pointer is at the card center", () => {
    const tilt = calculateCardTiltAngles({
      pointerX: 100,
      pointerY: 100,
      width: 200,
      height: 200,
      maxTiltDegrees: 4,
    });

    expect(tilt.rotateX).toBe(0);
    expect(tilt.rotateY).toBe(0);
  });

  test("tilts toward corners and clamps to max tilt", () => {
    const topLeftTilt = calculateCardTiltAngles({
      pointerX: 0,
      pointerY: 0,
      width: 200,
      height: 200,
      maxTiltDegrees: 4,
    });
    const bottomRightTilt = calculateCardTiltAngles({
      pointerX: 1000,
      pointerY: 1000,
      width: 200,
      height: 200,
      maxTiltDegrees: 4,
    });

    expect(topLeftTilt).toEqual({ rotateX: 4, rotateY: -4 });
    expect(bottomRightTilt).toEqual({ rotateX: -4, rotateY: 4 });
  });
});

describe("ValuePillarsCarousel", () => {
  test("renders cards with subtle elevated shadow and tilt-ready transform classes", () => {
    const html = renderToStaticMarkup(createElement(ValuePillarsCarousel, {
      headingId: "value-pillars-heading",
      heading: "Why this project exists",
      body: "Test body",
    }));

    expect(html).toContain("shadow-[0_12px_28px_-16px_rgba(0,0,0,0.75)]");
    expect(html).toContain("transition-transform");
    expect(html).toContain("will-change-transform");
  });

  test("adds slight top scroller spacing to prevent tilt clipping at the top edge", () => {
    const html = renderToStaticMarkup(createElement(ValuePillarsCarousel, {
      headingId: "value-pillars-heading",
      heading: "Why this project exists",
      body: "Test body",
    }));

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("pt-1.5");
  });
});
