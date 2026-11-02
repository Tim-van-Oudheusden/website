import type { HivePublicMetrics } from "shared";

/**
 * Hive metrics served in development when `HIVE_BASE_URL` is unset, so the front-end can be designed without a Hive.
 * Built from the recorded upstream fixtures in `test/back-end/src/features/hive/fixtures/` (repo window ending
 * 2026-11-02); the route test keeps the two in step.
 */
export const DEV_HIVE_METRICS: HivePublicMetrics = {
  online: true,
  hive: {
    mode: "quiet",
    agents: {
      total: 16,
      running: 14,
    },
    work: {
      issues: 2,
      prs: 6,
      held: 26,
      actionable: 2,
      mergeable: 0,
    },
    history: [
      {
        t: "2026-11-02T13:55:48.679Z",
        mode: "idle",
        issues: 3,
        prs: 2,
        held: 5,
      },
      {
        t: "2026-11-02T14:05:04.808Z",
        mode: "idle",
        issues: 2,
        prs: 3,
        held: 26,
      },
      {
        t: "2026-11-02T14:13:25.040Z",
        mode: "quiet",
        issues: 2,
        prs: 6,
        held: 26,
      },
    ],
  },
  contributors: {
    collectedAt: "2026-11-02T13:00:00.000Z",
    tasksPerHour: [
      1,
      1,
      1,
      0,
      1,
      0,
    ],
    fleetSize: [
      1,
      1,
      1,
      1,
      1,
      1,
    ],
    runs7d: {
      total: 76,
      backends: [
        {
          backend: "omp",
          completed: 74,
          failed: 0,
          abandoned: 2,
          p50Seconds: 328.967422074,
          p95Seconds: 1092.427634524,
        },
      ],
    },
  },
  repo: {
    from: "2026-10-27T00:00:00.000Z",
    to: "2026-11-02T15:00:00.000Z",
    days: [
      {
        t: "2026-10-27T00:00:00.000Z",
        opened: 0,
        merged: 0,
        closedUnmerged: 0,
      },
      {
        t: "2026-10-28T00:00:00.000Z",
        opened: 1,
        merged: 1,
        closedUnmerged: 0,
      },
      {
        t: "2026-10-29T00:00:00.000Z",
        opened: 1,
        merged: 0,
        closedUnmerged: 1,
      },
      {
        t: "2026-10-30T00:00:00.000Z",
        opened: 1,
        merged: 1,
        closedUnmerged: 0,
      },
      {
        t: "2026-10-31T00:00:00.000Z",
        opened: 0,
        merged: 0,
        closedUnmerged: 0,
      },
      {
        t: "2026-11-01T00:00:00.000Z",
        opened: 2,
        merged: 0,
        closedUnmerged: 0,
      },
      {
        t: "2026-11-02T00:00:00.000Z",
        opened: 1,
        merged: 2,
        closedUnmerged: 0,
      },
    ],
    mergedBySource: [
      {
        t: "2026-10-27T00:00:00.000Z",
        hive: 0,
        claudeCode: 0,
        dependabot: 0,
        other: 0,
      },
      {
        t: "2026-10-28T00:00:00.000Z",
        hive: 0,
        claudeCode: 0,
        dependabot: 1,
        other: 0,
      },
      {
        t: "2026-10-29T00:00:00.000Z",
        hive: 0,
        claudeCode: 0,
        dependabot: 0,
        other: 0,
      },
      {
        t: "2026-10-30T00:00:00.000Z",
        hive: 0,
        claudeCode: 1,
        dependabot: 0,
        other: 0,
      },
      {
        t: "2026-10-31T00:00:00.000Z",
        hive: 0,
        claudeCode: 0,
        dependabot: 0,
        other: 0,
      },
      {
        t: "2026-11-01T00:00:00.000Z",
        hive: 0,
        claudeCode: 0,
        dependabot: 0,
        other: 0,
      },
      {
        t: "2026-11-02T00:00:00.000Z",
        hive: 1,
        claudeCode: 0,
        dependabot: 0,
        other: 1,
      },
    ],
    medianHoursToMerge: 1.8263888888888888,
    p90HoursToMerge: 14.652777777777779,
  },
};
