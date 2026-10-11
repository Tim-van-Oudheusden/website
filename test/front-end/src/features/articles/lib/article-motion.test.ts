import { describe, expect, test } from "bun:test";

import {
  resolveArticleMotion,
  resolveRevealStep,
} from "../../../../../../front-end/src/features/articles/lib/article-motion";

const MOTION_FRIENDLY = {
  prefersReducedMotion: false,
  supportsIntersectionObserver: true,
  hasHashTarget: false,
};

describe("resolveArticleMotion", () => {
  test("plays the page enter and scroll reveals when nothing argues against motion", () => {
    expect(resolveArticleMotion(MOTION_FRIENDLY)).toEqual({ pageEnter: true, scrollReveal: true });
  });

  test("turns all motion off when the reader prefers reduced motion", () => {
    expect(resolveArticleMotion({ ...MOTION_FRIENDLY, prefersReducedMotion: true }))
      .toEqual({ pageEnter: false, scrollReveal: false });
  });

  test("keeps everything visible on a heading deep link", () => {
    expect(resolveArticleMotion({ ...MOTION_FRIENDLY, hasHashTarget: true }))
      .toEqual({ pageEnter: false, scrollReveal: false });
  });

  test("skips scroll reveals without IntersectionObserver but keeps the page enter", () => {
    expect(resolveArticleMotion({ ...MOTION_FRIENDLY, supportsIntersectionObserver: false }))
      .toEqual({ pageEnter: true, scrollReveal: false });
  });
});

const VIEWPORT_HEIGHT = 800;

describe("resolveRevealStep", () => {
  test("leaves a block that is in view on first observation visible", () => {
    expect(resolveRevealStep("unobserved", { isIntersecting: true, top: 600, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("visible");
  });

  test("leaves a block the reader has already scrolled past visible", () => {
    expect(resolveRevealStep("unobserved", { isIntersecting: false, top: -400, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("visible");
  });

  test("holds a block below the fold until it scrolls into view", () => {
    expect(resolveRevealStep("unobserved", { isIntersecting: false, top: 1200, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("pending");

    expect(resolveRevealStep("pending", { isIntersecting: false, top: 1000, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("pending");
  });

  test("reveals a held block once any part of it enters the viewport", () => {
    expect(resolveRevealStep("pending", { isIntersecting: true, top: 790, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("reveal");
  });

  test("reveals a held block the reader jumped past so it is never left hidden", () => {
    expect(resolveRevealStep("pending", { isIntersecting: false, top: -2000, viewportHeight: VIEWPORT_HEIGHT }))
      .toBe("reveal");
  });
});
