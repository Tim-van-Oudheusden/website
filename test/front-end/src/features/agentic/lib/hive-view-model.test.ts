import { describe, expect, test } from "bun:test";

import type { HiveMetricsResponse, HivePublicMetrics } from "shared";

import { buildHiveViewModel } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import type { PollingApiGetState } from "../../../../../../front-end/src/shared/hooks/use-polling-api-get";

const NOW = Date.parse("2026-11-02T14:15:00.000Z");
const FETCHED_AT = "2026-11-02T14:14:20.000Z";

function metrics(overrides: Partial<HivePublicMetrics> = {}): HivePublicMetrics {
  return {
    online: true,
    hive: {
      mode: "quiet",
      agents: { total: 16, running: 14 },
      work: { issues: 2, prs: 6, held: 26, actionable: 2, mergeable: 1 },
      history: [
        { t: "2026-11-02T12:00:00.000Z", mode: "idle", issues: 3, prs: 2, held: 5 },
        { t: "2026-11-02T13:00:00.000Z", mode: "idle", issues: 2, prs: 3, held: 26 },
        { t: "2026-11-02T13:30:00.000Z", mode: "busy", issues: 2, prs: 6, held: 26 },
        { t: "2026-11-02T14:00:00.000Z", mode: "quiet", issues: 2, prs: 6, held: 26 },
      ],
    },
    contributors: null,
    repo: null,
    ...overrides,
  };
}

function poll(
  response: HiveMetricsResponse | null,
  { status = "success", stale = false }: Partial<Pick<PollingApiGetState<HiveMetricsResponse>, "stale" | "status">> = {},
): PollingApiGetState<HiveMetricsResponse> {
  return { status, data: response, error: status === "error" ? "down" : null, stale };
}

function live(body: HivePublicMetrics = metrics()): HiveMetricsResponse {
  return { state: "live", fetchedAt: FETCHED_AT, metrics: body };
}

describe("buildHiveViewModel status", () => {
  test("is live with the age of the last good answer, stale with its clock time, and offline when Hive is down", () => {
    expect(buildHiveViewModel(poll(live()), NOW, "UTC").status)
      .toEqual({ kind: "live", label: "Live", detail: "updated 40 s ago", at: FETCHED_AT });

    expect(buildHiveViewModel(poll(live(), { status: "error", stale: true }), NOW, "UTC").status)
      .toEqual({ kind: "stale", label: "Stale", detail: "last update 14:14", at: FETCHED_AT });

    expect(buildHiveViewModel(poll(live(metrics({ online: false }))), NOW, "UTC").status)
      .toEqual({ kind: "offline", label: "Offline", detail: null, at: null });

    expect(buildHiveViewModel(poll(null, { status: "loading" }), NOW, "UTC").status)
      .toEqual({ kind: "connecting", label: "Connecting", detail: null, at: null });
  });
});

describe("buildHiveViewModel fallback", () => {
  test("explains a load in progress or a total outage instead of drawing empty parts, and draws any part it has", () => {
    const loading = buildHiveViewModel(poll(null, { status: "loading" }), NOW, "UTC");
    const down = buildHiveViewModel(poll({ state: "unavailable", fetchedAt: null, metrics: null }), NOW, "UTC");
    const partial = buildHiveViewModel(poll(live(metrics({ online: false }))), NOW, "UTC");

    expect(loading.fallback).toBe("Loading the live numbers…");
    expect(loading.hive).toBeNull();
    expect(down.fallback).toStartWith("The live numbers are not available right now");
    expect(down.hive).toBeNull();
    expect(partial.fallback).toBeNull();
    expect(partial.hive?.agents).toEqual({ running: 14, total: 16 });
    expect(partial.contributors).toBeNull();
    expect(partial.repo).toBeNull();
  });
});

describe("buildHiveViewModel hive", () => {
  test("counts open work, labels the history in the given zone, and spans only what the history measured", () => {
    const { hive } = buildHiveViewModel(poll(live()), NOW, "Europe/Amsterdam");

    expect(hive?.mode).toBe("quiet");
    expect(hive?.work).toEqual({ open: 8, issues: 2, prs: 6, held: 26, actionable: 2, mergeable: 1 });
    expect(hive?.span).toBe("last 2 hours");
    expect(hive?.history.map((point) => point.label)).toEqual(["13:00", "14:00", "14:30", "15:00"]);
    expect(hive?.history.at(-1)).toMatchObject({ mode: "quiet", issues: 2, prs: 6, held: 26 });
  });

  test("gives each governor mode's share of the history, coolest first, including modes it never reached", () => {
    const { hive } = buildHiveViewModel(poll(live()), NOW, "UTC");

    expect(hive?.modeShare).toEqual([
      { mode: "idle", points: 2, share: 0.5 },
      { mode: "quiet", points: 1, share: 0.25 },
      { mode: "busy", points: 1, share: 0.25 },
      { mode: "surge", points: 0, share: 0 },
    ]);
  });

  test("keeps one point per evaluation when Hive repeats a timestamp, as the live widget does", () => {
    const base = metrics();
    const history = base.hive?.history.flatMap((point) => [point, point]) ?? [];
    const { hive } = buildHiveViewModel(poll(live(metrics({ hive: base.hive && { ...base.hive, history } }))), NOW, "UTC");

    expect(hive?.history).toHaveLength(4);
    expect(hive?.modeShare[0]).toEqual({ mode: "idle", points: 2, share: 0.5 });
  });
});

describe("buildHiveViewModel contributors", () => {
  const contributors: NonNullable<HivePublicMetrics["contributors"]> = {
    collectedAt: "2026-11-02T01:00:00.000Z",
    tasksPerHour: [1, 0, 2],
    fleetSize: [1, 1, 2],
    runs7d: {
      total: 80,
      backends: [
        { backend: "omp", completed: 74, failed: 0, abandoned: 2, p50Seconds: 329, p95Seconds: 1092 },
        { backend: "claude", completed: 3, failed: 1, abandoned: 0, p50Seconds: null, p95Seconds: null },
      ],
    },
  };

  test("dates each hourly bucket back from the collection hour, and grids the tasks by day and hour of day", () => {
    const view = buildHiveViewModel(poll(live(metrics({ contributors }))), NOW, "UTC").contributors;

    expect(view?.tasksTotal).toBe(3);
    expect(view?.fleet).toBe(2);
    expect(view?.hours.map((hour) => hour.label)).toEqual(["Sun 23:00", "Mon 00:00", "Mon 01:00"]);
    expect(view?.peak).toEqual({ label: "Mon 01:00", tasks: 2 });

    expect(view?.heatmap).toEqual({
      days: ["Sun 1 Nov", "Mon 2 Nov"],
      cells: [{ day: 0, hour: 23, tasks: 1 }, { day: 1, hour: 0, tasks: 0 }, { day: 1, hour: 1, tasks: 2 }],
    });
  });

  test("rates runs per backend with its own percentiles, and adds up only the counts across backends", () => {
    const runs = buildHiveViewModel(poll(live(metrics({ contributors }))), NOW, "UTC").contributors?.runs;

    expect(runs?.total).toBe(80);
    expect(runs?.outcomes).toEqual({ completed: 77, failed: 1, abandoned: 2 });

    expect(runs?.backends).toEqual([
      { name: "omp", runs: 76, completed: 74, failed: 0, abandoned: 2, successRate: 74 / 76, p50: "5 min", p95: "18 min" },
      { name: "claude", runs: 4, completed: 3, failed: 1, abandoned: 0, successRate: 0.75, p50: null, p95: null },
    ]);
  });
});

describe("buildHiveViewModel repo", () => {
  const repo: NonNullable<HivePublicMetrics["repo"]> = {
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
    p90HoursToMerge: 14.2,
  };

  test("totals the week's pull requests per UTC day, and gives each author's share of the merged work", () => {
    const view = buildHiveViewModel(poll(live(metrics({ hive: null, repo }))), NOW, "UTC").repo;

    expect(view?.days.map((day) => day.label)).toEqual(["Sun 1 Nov", "Mon 2 Nov"]);
    expect(view?.totals).toEqual({ opened: 10, merged: 8, closedUnmerged: 1 });
    expect(view?.merged).toBe(8);

    expect(view?.sources).toEqual([
      { key: "hive", name: "Hive", merged: 6, share: 0.75 },
      { key: "claudeCode", name: "Claude Code", merged: 1, share: 0.125 },
      { key: "dependabot", name: "Dependabot", merged: 1, share: 0.125 },
      { key: "other", name: "other", merged: 0, share: 0 },
    ]);

    expect(view?.timeToMerge).toEqual({ median: "30 min", p90: "14 h" });
  });
});
