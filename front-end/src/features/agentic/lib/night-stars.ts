import type { HiveMetricsResponse } from "shared";

/** The stars pre-placed in the night sky; a busier day than this still shows a full sky. */
export const MAX_NIGHT_STARS = 60;

/** One day of hourly buckets. */
const LAST_DAY = 24;

/**
 * How many stars the night sky shows: the tasks contributor agents completed in
 * the last 24 hours (the newest 24 `tasksPerHour` buckets), capped at
 * `MAX_NIGHT_STARS`. `null` means there is no such number (no response, Hive
 * unavailable, no contributor data or an empty series) and the scene keeps its
 * default sky.
 */
export function nightStarCount(response: HiveMetricsResponse | null): number | null {
  const buckets = response?.state === "unavailable" ? undefined : response?.metrics?.contributors?.tasksPerHour;

  if (buckets === undefined || buckets.length === 0) {
    return null;
  }

  const tasks = buckets.slice(-LAST_DAY).reduce((sum, count) => sum + count, 0);

  return Math.min(tasks, MAX_NIGHT_STARS);
}
