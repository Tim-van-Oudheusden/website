import { describe, expect, test } from "bun:test";

import { tagSlug } from "../../../shared/src/tags";

describe("tagSlug", () => {
  test("lowercases a tag and joins its words with one hyphen", () => {
    expect(tagSlug("Content API")).toBe("content-api");
    expect(tagSlug("  Node.js -- tips ")).toBe("node-js-tips");
  });

  test("keeps + and # so programming-language tags stay apart", () => {
    expect(new Set(["C", "C++", "C#", "F#"].map(tagSlug))).toEqual(new Set(["c", "c++", "c#", "f#"]));
  });

  test("gives the composed and decomposed spelling of a tag one slug", () => {
    expect(tagSlug("Café")).toBe(tagSlug("Café"));
    expect(tagSlug("Café")).toBe("café");
  });

  test("comes out empty for a tag with no letter, digit, + or #", () => {
    expect(tagSlug("\u{1F980}")).toBe("");
    expect(tagSlug("...")).toBe("");
  });
});
