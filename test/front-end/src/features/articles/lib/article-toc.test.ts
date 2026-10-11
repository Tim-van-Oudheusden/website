import { describe, expect, test } from "bun:test";

import type { ArticleTableOfContentsItem } from "../../../../../../front-end/src/features/articles/lib/article-toc";
import {
  resolveActiveTocHeadingIds,
  resolveCurrentTocHeadingId,
  resolveTocLinkIndentClass,
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

describe("resolveCurrentTocHeadingId", () => {
  function current(tops: Record<string, number>, viewportHeight = 1000): string | null {
    return resolveCurrentTocHeadingId(
      TOC_ITEMS,
      (id) => {
        const top = tops[id];

        return top === undefined ? null : { top };
      },
      viewportHeight,
    );
  }

  test("is the last heading that has passed the reading line near the top of the viewport", () => {
    expect(current({ intro: -900, start: 120, details: 600 })).toBe("start");
  });

  test("ignores a heading that has only just appeared at the bottom of the viewport", () => {
    expect(current({ intro: -900, start: 80, details: 980 })).toBe("start");
  });

  test("falls back to the first heading in view before any heading reaches the reading line", () => {
    expect(current({ intro: 700, start: 1600, details: 2400 })).toBe("intro");
  });

  test("is null when no heading is reached or in view", () => {
    expect(current({ intro: 1200, start: 1600 })).toBeNull();
    expect(current({})).toBeNull();
  });
});

describe("resolveTocLinkIndentClass", () => {
  test("indents only third-level toc entries", () => {
    expect(resolveTocLinkIndentClass(1)).toBe("");
    expect(resolveTocLinkIndentClass(2)).toBe("");
    expect(resolveTocLinkIndentClass(3)).toBe("pl-3");
  });
});
