import { describe, expect, test } from "bun:test";

import type { HiveMetricsResponse, HivePublicMetrics } from "shared";

import { MAX_NIGHT_STARS, nightStarCount } from "../../../../../../front-end/src/features/agentic/lib/night-stars";

type Contributors = NonNullable<HivePublicMetrics["contributors"]>;

function contributors(tasksPerHour: number[]): Contributors {
  return {
    collectedAt: "2026-11-02T12:00:00Z",
    tasksPerHour,
    fleetSize: tasksPerHour.map(() => 3),
    runs7d: { total: 0, backends: [] },
  };
}

function live(contributorPart: Contributors | null): HiveMetricsResponse {
  return {
    state: "live",
    fetchedAt: "2026-11-02T12:00:00Z",
    metrics: { online: true, hive: null, contributors: contributorPart, repo: null },
  };
}

describe("nightStarCount", () => {
  test("counts the tasks contributor agents completed in the last 24 hourly buckets", () => {
    // 168 buckets, oldest first: the 144 older ones (all 9s) must not count; the last 24 are 0, 1, 0, 1, ...
    const buckets = [...Array<number>(144).fill(9), ...Array.from({ length: 24 }, (_, hour) => hour % 2)];

    expect(nightStarCount(live(contributors(buckets)))).toBe(12);
  });

  test("counts every bucket when Hive sends fewer than 24", () => {
    expect(nightStarCount(live(contributors([2, 3, 4])))).toBe(9);
  });

  test("shows an empty sky after a day without tasks", () => {
    expect(nightStarCount(live(contributors(Array<number>(24).fill(0))))).toBe(0);
  });

  test("caps the count at the number of stars the sky has room for", () => {
    expect(MAX_NIGHT_STARS).toBe(60);
    expect(nightStarCount(live(contributors(Array<number>(24).fill(10))))).toBe(60);
  });

  test("falls back to the default sky without contributor numbers", () => {
    expect(nightStarCount(null)).toBeNull();
    expect(nightStarCount({ state: "unavailable", fetchedAt: null, metrics: null })).toBeNull();
    expect(nightStarCount(live(null))).toBeNull();
    // Malformed upstream series arrive as empty arrays: that is no data, not zero tasks.
    expect(nightStarCount(live(contributors([])))).toBeNull();
  });
});
