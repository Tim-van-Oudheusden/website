import { describe, expect, test } from "bun:test";

import { formatExperienceRange, sortNewestFirst } from "../../../../../../front-end/src/features/home/lib/experience-dates";

describe("formatExperienceRange", () => {
  test("shows a current role as running to the present", () => {
    expect(formatExperienceRange("2024-10", null)).toEqual({ label: "2024 — Present", spoken: "2024 to Present" });
  });

  test("shows only the years for a role spanning several years", () => {
    expect(formatExperienceRange("2022-09", "2023-04")).toEqual({ label: "2022 — 2023", spoken: "2022 to 2023" });
  });

  test("names the months for a role that starts and ends in the same year", () => {
    expect(formatExperienceRange("2017-07", "2017-12")).toEqual({ label: "Jul — Dec 2017", spoken: "July to December 2017" });
    expect(formatExperienceRange("2023-05", "2023-09")).toEqual({ label: "May — Sep 2023", spoken: "May to September 2023" });
  });
});

describe("sortNewestFirst", () => {
  test("orders roles by start month, newest first, whatever order they are written in", () => {
    const roles = [{ start: "2019-09" }, { start: "2024-10" }, { start: "2018-09" }, { start: "2023-10" }];

    expect(sortNewestFirst(roles).map((role) => role.start)).toEqual(["2024-10", "2023-10", "2019-09", "2018-09"]);
  });
});
