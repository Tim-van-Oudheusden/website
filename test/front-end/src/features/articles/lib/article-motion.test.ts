import { describe, expect, test } from "bun:test";

import { resolveArticleMotion } from "../../../../../../front-end/src/features/articles/lib/article-motion";

const MOTION_FRIENDLY = {
  prefersReducedMotion: false,
  hasHashTarget: false,
};

describe("resolveArticleMotion", () => {
  test("plays the page enter when nothing argues against motion", () => {
    expect(resolveArticleMotion(MOTION_FRIENDLY)).toEqual({ pageEnter: true });
  });

  test("skips the page enter when the reader prefers reduced motion", () => {
    expect(resolveArticleMotion({ ...MOTION_FRIENDLY, prefersReducedMotion: true })).toEqual({ pageEnter: false });
  });

  test("skips the page enter on a heading deep link", () => {
    expect(resolveArticleMotion({ ...MOTION_FRIENDLY, hasHashTarget: true })).toEqual({ pageEnter: false });
  });
});
