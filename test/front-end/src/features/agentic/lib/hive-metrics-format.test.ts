import { describe, expect, test } from "bun:test";

import {
  formatAgo,
  formatDuration,
  formatHours,
  formatSpan,
} from "../../../../../../front-end/src/features/agentic/lib/hive-metrics-format";

const AT = "2026-11-02T12:00:00.000Z";
const MS = Date.parse(AT);

describe("hive metrics formats", () => {
  test("ages an update in the largest whole unit, and never into the future", () => {
    expect(formatAgo(AT, MS + 40_000)).toBe("40 s ago");
    expect(formatAgo(AT, MS + (3 * 60_000) + 59_000)).toBe("3 min ago");
    expect(formatAgo(AT, MS + (2 * 3_600_000) + 1)).toBe("2 h ago");
    expect(formatAgo(AT, MS + (4 * 86_400_000))).toBe("4 d ago");
    expect(formatAgo(AT, MS - 5_000)).toBe("0 s ago");
  });

  test("gives run times in seconds, minutes or hours, and times to merge in minutes below an hour", () => {
    expect(formatDuration(90)).toBe("90 s");
    expect(formatDuration(329)).toBe("5 min");
    expect(formatDuration(5_400)).toBe("1.5 h");
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(1.44)).toBe("1.4 h");
    expect(formatHours(14.6)).toBe("15 h");
  });

  test("names a span in minutes, hours or days, and none under a minute", () => {
    expect(formatSpan(AT, "2026-11-02T12:00:20.000Z")).toBeNull();
    expect(formatSpan(AT, "2026-11-02T12:18:00.000Z")).toBe("last 18 minutes");
    expect(formatSpan(AT, "2026-11-03T05:00:00.000Z")).toBe("last 17 hours");
    expect(formatSpan(AT, "2026-11-05T12:00:00.000Z")).toBe("last 3 days");
  });
});
