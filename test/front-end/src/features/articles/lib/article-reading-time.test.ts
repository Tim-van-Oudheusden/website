import { describe, expect, test } from "bun:test";

import { estimateReadingMinutes } from "../../../../../../front-end/src/features/articles/lib/article-reading-time";

function words(count: number): string {
  return Array.from({ length: count }, () => "word").join(" ");
}

describe("estimateReadingMinutes", () => {
  test("rounds up to whole minutes at 230 words per minute", () => {
    expect(estimateReadingMinutes(words(230))).toBe(1);
    expect(estimateReadingMinutes(words(231))).toBe(2);
    expect(estimateReadingMinutes(words(1150))).toBe(5);
  });

  test("never reports less than one minute", () => {
    expect(estimateReadingMinutes("")).toBe(1);
    expect(estimateReadingMinutes("Short.")).toBe(1);
  });

  test("counts words, not markdown syntax or link targets", () => {
    const markdown = `# Heading\n\n${words(229)} [link](https://example.com/a/very/long/path) **bold**`;

    // 1 heading word + 229 + "link" + "bold" = 232 words.
    expect(estimateReadingMinutes(markdown)).toBe(2);
    expect(estimateReadingMinutes(`> [!quote]\n> ${words(229)}`)).toBe(1);
  });
});
