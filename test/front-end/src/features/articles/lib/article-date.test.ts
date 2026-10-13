import { describe, expect, test } from "bun:test";

import { formatArticleDate } from "../../../../../../front-end/src/features/articles/lib/article-date";

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

  // A bad date that slips past validate:content must not throw and blank the app.
  test("returns a date it cannot read unchanged", () => {
    expect(formatArticleDate("2026-13-01")).toBe("2026-13-01");
  });
});
