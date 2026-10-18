import { describe, expect, test } from "bun:test";

import { resolveSocialImagePath } from "../../../shared/src/social-image";

describe("resolveSocialImagePath", () => {
  test("serves a content-relative image from the back-end asset prefix", () => {
    expect(resolveSocialImagePath("images/cover.png")).toBe("/content-assets/images/cover.png");
  });

  test("keeps a site path from the front-end public folder unchanged", () => {
    expect(resolveSocialImagePath("/images/me.png")).toBe("/images/me.png");
  });

  test("keeps a full http(s) URL unchanged instead of reading it as a content path", () => {
    expect(resolveSocialImagePath("https://example.com/cover.png")).toBe("https://example.com/cover.png");
    expect(resolveSocialImagePath("http://example.com/cover.png")).toBe("http://example.com/cover.png");
  });

  test("returns null when no social image is set, so callers pick their fallback", () => {
    expect(resolveSocialImagePath(null)).toBeNull();
  });
});
