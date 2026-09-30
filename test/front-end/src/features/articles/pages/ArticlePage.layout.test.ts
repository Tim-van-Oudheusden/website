import { describe, expect, test } from "bun:test";
import { ARTICLE_PAGE_TYPOGRAPHY_CLASSES } from "../../../../../../front-end/src/features/articles/pages/ArticlePage";

describe("ARTICLE_PAGE_TYPOGRAPHY_CLASSES", () => {
  test("uses readable article hierarchy and measure defaults", () => {
    expect(ARTICLE_PAGE_TYPOGRAPHY_CLASSES.mainMeasure).toContain("mx-auto w-full max-w-[75ch]");
    expect(ARTICLE_PAGE_TYPOGRAPHY_CLASSES.title).toContain("text-[1.75rem] sm:text-[2rem] font-semibold tracking-tight");
    expect(ARTICLE_PAGE_TYPOGRAPHY_CLASSES.description).toContain("max-w-[65ch] text-base sm:text-lg leading-relaxed");
    expect(ARTICLE_PAGE_TYPOGRAPHY_CLASSES.metaTime).toContain("text-sm font-medium");
    expect(ARTICLE_PAGE_TYPOGRAPHY_CLASSES.tagBadge).toContain("text-xs font-bold");
  });
});
