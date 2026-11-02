import type { HiveMetricsResponse, HivePublicMetrics } from "shared";

import type { HiveViewModel } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import { buildHiveViewModel } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";

export const NOW = Date.parse("2026-11-02T14:15:00.000Z");

/** Live metrics with every part present: two days of hourly tasks, two backends, one week of PRs. */
export function liveMetrics(overrides: Partial<HivePublicMetrics> = {}): HivePublicMetrics {
  return {
    online: true,
    hive: {
      mode: "busy",
      agents: { total: 16, running: 14 },
      work: { issues: 2, prs: 6, held: 26, actionable: 2, mergeable: 1 },
      history: [
        { t: "2026-11-02T12:00:00.000Z", mode: "idle", issues: 3, prs: 2, held: 5 },
        { t: "2026-11-02T13:00:00.000Z", mode: "quiet", issues: 2, prs: 3, held: 26 },
        { t: "2026-11-02T14:00:00.000Z", mode: "busy", issues: 2, prs: 6, held: 26 },
      ],
    },
    contributors: {
      collectedAt: "2026-11-02T01:00:00.000Z",
      tasksPerHour: [1, 0, 4],
      fleetSize: [1, 1, 2],
      runs7d: {
        total: 80,
        backends: [
          { backend: "omp", completed: 74, failed: 0, abandoned: 2, p50Seconds: 329, p95Seconds: 1092 },
          { backend: "claude", completed: 3, failed: 1, abandoned: 0, p50Seconds: null, p95Seconds: null },
        ],
      },
    },
    repo: {
      from: "2026-11-01T00:00:00.000Z",
      to: "2026-11-02T15:00:00.000Z",
      days: [
        { t: "2026-11-01T00:00:00.000Z", opened: 6, merged: 5, closedUnmerged: 1 },
        { t: "2026-11-02T00:00:00.000Z", opened: 4, merged: 3, closedUnmerged: 0 },
      ],
      mergedBySource: [
        { t: "2026-11-01T00:00:00.000Z", hive: 3, claudeCode: 1, dependabot: 1, other: 0 },
        { t: "2026-11-02T00:00:00.000Z", hive: 3, claudeCode: 0, dependabot: 0, other: 0 },
      ],
      medianHoursToMerge: 0.5,
      p90HoursToMerge: null,
    },
    ...overrides,
  };
}

/** The view model of one successful poll of `response`, clocked in UTC. */
export function modelOf(response: HiveMetricsResponse): HiveViewModel {
  return buildHiveViewModel({ status: "success", data: response, error: null, stale: false }, NOW, "UTC");
}

export function liveModel(overrides: Partial<HivePublicMetrics> = {}): HiveViewModel {
  return modelOf({ state: "live", fetchedAt: "2026-11-02T14:14:20.000Z", metrics: liveMetrics(overrides) });
}
