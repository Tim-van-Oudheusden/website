import { describe, expect, test } from "bun:test";

import { formatArticleDate } from "../../../../../../front-end/src/features/home/lib/article-date";

describe("formatArticleDate", () => {
  test("writes the month name, ordinal day and year", () => {
    expect(formatArticleDate("2025-10-02")).toBe("October 2nd, 2025");
  });

  test("uses English ordinals, including the 11th–13th exceptions", () => {
    expect(["2025-01-01", "2025-01-11", "2025-01-12", "2025-01-13", "2025-01-21", "2025-01-22", "2025-01-23"].map(formatArticleDate)).toEqual([
      "January 1st, 2025",
      "January 11th, 2025",
      "January 12th, 2025",
      "January 13th, 2025",
      "January 21st, 2025",
      "January 22nd, 2025",
      "January 23rd, 2025",
    ]);
  });
});
