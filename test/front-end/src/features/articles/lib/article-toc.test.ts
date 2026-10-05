import { describe, expect, test } from "bun:test";
import {
  resolveActiveTocHeadingIds,
  resolveTocLinkIndentClass,
  type ArticleTableOfContentsItem,
} from "../../../../../../front-end/src/features/articles/lib/article-toc";

const TOC_ITEMS: ArticleTableOfContentsItem[] = [
  { id: "intro", text: "Intro", depth: 1 },
  { id: "start", text: "Start", depth: 2 },
  { id: "details", text: "Details", depth: 3 },
];

describe("resolveActiveTocHeadingIds", () => {
  test("keeps headings whose rect sits above the viewport fold", () => {
    const rects: Record<string, number> = { intro: 10, start: 500, details: 200 };

    const active = resolveActiveTocHeadingIds(
      TOC_ITEMS,
      (id) => {
        const top = rects[id];

        return top === undefined ? null : { top };
      },
      300,
    );

    expect(active).toEqual(["intro", "details"]);
  });

  test("drops headings with no measurable rect", () => {
    const active = resolveActiveTocHeadingIds(
      TOC_ITEMS,
      () => null,
      300,
    );

    expect(active).toEqual([]);
  });
});

describe("resolveTocLinkIndentClass", () => {
  test("indents only third-level toc entries", () => {
    expect(resolveTocLinkIndentClass(1)).toBe("");
    expect(resolveTocLinkIndentClass(2)).toBe("");
    expect(resolveTocLinkIndentClass(3)).toBe("pl-3");
  });
});
