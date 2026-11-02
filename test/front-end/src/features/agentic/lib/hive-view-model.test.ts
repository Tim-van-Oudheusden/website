import { describe, expect, test } from "bun:test";

import type { HiveMetricsResponse, HivePublicMetrics } from "shared";

import type { BoardItem, HiveChartView, HiveView, PanelView } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import { buildHiveView } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import type { PollingApiGetState } from "../../../../../../front-end/src/shared/hooks/use-polling-api-get";

const FETCHED_AT = "2026-11-02T14:05:00.000Z";
/** 40 s after the back-end's last good fetch. */
const NOW = Date.parse(FETCHED_AT) + 40_000;

/** Fixture-like metrics: a 17-hour queue history, two backends and a week of this repo's PRs. */
function metrics(): HivePublicMetrics {
  return {
    online: true,
    hive: {
      mode: "busy",
      agents: { total: 7, running: 5 },
      work: { issues: 14, prs: 9, held: 4, actionable: 11, mergeable: 6 },
      history: [
        { t: "2026-11-01T21:05:00.000Z", mode: "quiet", issues: 12, prs: 6, held: 3 },
        { t: "2026-11-02T06:05:00.000Z", mode: "busy", issues: 16, prs: 8, held: 4 },
        { t: "2026-11-02T14:05:00.000Z", mode: "busy", issues: 14, prs: 9, held: 4 },
      ],
    },
    contributors: {
      collectedAt: "2026-11-02T13:00:00.000Z",
      tasksPerHour: [1, 0, 3, 2],
      fleetSize: [1, 1, 2, 2],
      runs7d: {
        total: 95,
        backends: [
          { backend: "omp", completed: 62, failed: 9, abandoned: 4, p50Seconds: 360, p95Seconds: 1260 },
          { backend: "codex", completed: 18, failed: 2, abandoned: 0, p50Seconds: 90, p95Seconds: null },
        ],
      },
    },
    repo: {
      from: "2026-10-27T00:00:00.000Z",
      to: "2026-11-02T15:00:00.000Z",
      days: [
        { t: "2026-10-27T00:00:00.000Z", opened: 6, merged: 5, closedUnmerged: 1 },
        { t: "2026-10-28T00:00:00.000Z", opened: 8, merged: 7, closedUnmerged: 0 },
        { t: "2026-10-29T00:00:00.000Z", opened: 5, merged: 6, closedUnmerged: 2 },
        { t: "2026-10-30T00:00:00.000Z", opened: 9, merged: 8, closedUnmerged: 1 },
        { t: "2026-10-31T00:00:00.000Z", opened: 7, merged: 6, closedUnmerged: 1 },
        { t: "2026-11-01T00:00:00.000Z", opened: 4, merged: 3, closedUnmerged: 0 },
        { t: "2026-11-02T00:00:00.000Z", opened: 6, merged: 6, closedUnmerged: 1 },
      ],
      mergedBySource: [
        { t: "2026-10-27T00:00:00.000Z", hive: 3, claudeCode: 1, dependabot: 1, other: 0 },
        { t: "2026-10-28T00:00:00.000Z", hive: 6, claudeCode: 0, dependabot: 0, other: 1 },
        { t: "2026-10-29T00:00:00.000Z", hive: 4, claudeCode: 1, dependabot: 1, other: 0 },
        { t: "2026-10-30T00:00:00.000Z", hive: 7, claudeCode: 0, dependabot: 0, other: 1 },
        { t: "2026-10-31T00:00:00.000Z", hive: 5, claudeCode: 1, dependabot: 0, other: 0 },
        { t: "2026-11-01T00:00:00.000Z", hive: 3, claudeCode: 0, dependabot: 0, other: 0 },
        { t: "2026-11-02T00:00:00.000Z", hive: 5, claudeCode: 0, dependabot: 0, other: 1 },
      ],
      medianHoursToMerge: 1.4,
      p90HoursToMerge: 9,
    },
  };
}

function response(overrides: Partial<HiveMetricsResponse> = {}): HiveMetricsResponse {
  return { state: "live", fetchedAt: FETCHED_AT, metrics: metrics(), ...overrides };
}

function withMetrics(overrides: Partial<HivePublicMetrics>): HiveMetricsResponse {
  return response({ metrics: { ...metrics(), ...overrides } });
}

function polled(data: HiveMetricsResponse | null, stale = false): PollingApiGetState<HiveMetricsResponse> {
  return { status: data === null ? "loading" : "success", data, error: null, stale };
}

function view(poll: PollingApiGetState<HiveMetricsResponse> = polled(response())): HiveView {
  return buildHiveView(poll, NOW, "UTC");
}

function panels(board: readonly BoardItem[]): PanelView[] {
  return board.flatMap((item) => (item.kind === "panel" ? [item.panel] : []));
}

function panel(board: readonly BoardItem[], id: PanelView["id"]): PanelView {
  const found = panels(board).find((candidate) => candidate.id === id);

  if (found === undefined) {
    throw new Error(`No ${id} panel`);
  }

  return found;
}

function chartOf(board: readonly BoardItem[], id: PanelView["id"]): HiveChartView {
  const { chart } = panel(board, id);

  if (chart === null) {
    throw new Error(`The ${id} panel has no chart`);
  }

  return chart;
}

describe("buildHiveView status", () => {
  test("is live with the age of the last update and its absolute time", () => {
    expect(view().status).toEqual({
      kind: "live",
      label: "Live",
      detail: { prefix: "updated", at: FETCHED_AT, text: "40 s ago", title: "2 Nov 2026, 14:05 UTC" },
    });
  });

  test("is stale with the clock time of the last update when a part is old or the latest poll failed", () => {
    for (const poll of [polled(response({ state: "stale" })), polled(response(), true)]) {
      expect(view(poll).status).toEqual({
        kind: "stale",
        label: "Stale",
        detail: { prefix: "last update", at: FETCHED_AT, text: "14:05", title: "2 Nov 2026, 14:05 UTC" },
      });
    }
  });

  test("is offline when Hive's health check fails, while the numbers it still has stay on the board", () => {
    const offline = view(polled(withMetrics({ online: false })));

    expect(offline.status).toEqual({ kind: "offline", label: "Offline", detail: null });
    expect(panels(offline.board).length).toBeGreaterThan(0);
  });

  test("is connecting until the first poll lands, and offline when it fails", () => {
    expect(view(polled(null)).status).toEqual({ kind: "connecting", label: "Connecting", detail: null });

    expect(view({ status: "error", data: null, error: "Failed to reach back-end", stale: false }).status.kind)
      .toBe("offline");
  });
});

describe("buildHiveView fallbacks", () => {
  test("says it is loading, with an empty board, until the first poll lands", () => {
    const loading = view(polled(null));

    expect(loading.fallback).toBe("Loading the live numbers…");
    expect(loading.board).toEqual([]);
  });

  test("gives one short explanation and an empty board when nothing is available", () => {
    const explanation = "The live numbers are not available right now: this site cannot reach Hive or GitHub. "
      + "They fill in on their own once it can.";
    const polls: PollingApiGetState<HiveMetricsResponse>[] = [
      polled({ state: "unavailable", fetchedAt: null, metrics: null }),
      polled(withMetrics({ hive: null, contributors: null, repo: null })),
      { status: "error", data: null, error: "Failed to reach back-end", stale: false },
    ];

    for (const poll of polls) {
      expect(view(poll).fallback).toBe(explanation);
      expect(view(poll).board).toEqual([]);
    }
  });

  test("replaces only the panels of a missing part with one line, in that part's place", () => {
    const cases = [
      { part: "hive", line: "Live queue data is not connected right now.", gone: ["kpis", "queue", "mode"] },
      { part: "contributors", line: "Contributor agent data is not available right now.", gone: ["contributors", "runs"] },
      { part: "repo", line: "Pull request data for this repo is not available right now.", gone: ["pull-requests", "merged-by"] },
    ] as const;
    const order = ["kpis", "queue", "mode", "contributors", "runs", "pull-requests", "merged-by"];

    for (const { part, line, gone } of cases) {
      const { board, fallback } = view(polled(withMetrics({ [part]: null })));
      const ids: string[] = board.map((item) => (item.kind === "panel" ? item.panel.id : item.kind));
      const at = order.indexOf(gone[0]);

      expect(fallback).toBeNull();
      expect(ids).toEqual([...order.slice(0, at), "missing", ...order.slice(at + gone.length)]);
      expect(board.find((item) => item.kind === "missing")).toEqual({ kind: "missing", part, text: line });
    }
  });
});

describe("buildHiveView headline numbers", () => {
  test("gives four numbers from the latest widget point", () => {
    expect(view().board[0]).toEqual({
      kind: "kpis",
      kpis: [
        { id: "agents", label: "Agents running", value: "5 / 7", detail: "of the agents configured" },
        { id: "open-work", label: "Open work", value: "23", detail: "14 issues · 9 PRs · 4 held" },
        { id: "mergeable", label: "Ready to merge", value: "6", detail: "11 actionable" },
        { id: "mode", label: "Governor mode", value: "busy", detail: "how hard Hive is working the queue" },
      ],
    });
  });
});

describe("buildHiveView panels", () => {
  test("titles the queue with the span its history measured, never an assumed one", () => {
    function history(points: [string, number][]): NonNullable<HivePublicMetrics["hive"]>["history"] {
      return points.map(([t, issues]) => ({ t, mode: "idle", issues, prs: 1, held: 0 }));
    }

    const base = metrics().hive;

    if (base === null) {
      throw new Error("The fixture has a widget part");
    }

    const cases = [
      { history: base.history, title: "Queue, last 17 hours" },
      { history: history([["2026-11-02T13:55:48.679Z", 3], ["2026-11-02T14:13:25.040Z", 2]]), title: "Queue, last 18 minutes" },
      { history: history([["2026-10-31T14:00:00.000Z", 3], ["2026-11-02T14:00:00.000Z", 2]]), title: "Queue, last 2 days" },
      { history: history([["2026-11-02T14:00:00.000Z", 3]]), title: "Queue, latest point" },
    ];

    for (const { history: points, title } of cases) {
      expect(panel(view(polled(withMetrics({ hive: { ...base, history: points } }))).board, "queue").title).toBe(title);
    }
  });

  test("draws the queue as three lines over the evaluation times, and says where each stands", () => {
    const queue = chartOf(view().board, "queue");

    expect(queue.kind).toBe("line");
    expect(queue.categories).toEqual(["21:05", "06:05", "14:05"]);

    expect(queue.series.map((series) => [series.name, series.values])).toEqual([
      ["issues", [12, 16, 14]],
      ["PRs", [6, 8, 9]],
      ["held", [3, 4, 4]],
    ]);

    expect(queue.summary).toBe(
      "Open issues, open PRs and held work: issues between 12 and 16, now 14; PRs between 6 and 9, now 9; "
      + "held between 3 and 4, now 4",
    );
  });

  test("steps the governor mode through its four levels and counts its changes", () => {
    const mode = chartOf(view().board, "mode");

    expect(mode.kind).toBe("steps");
    expect(mode.levels).toEqual(["idle", "quiet", "busy", "surge"]);
    expect(mode.series.map((series) => series.values)).toEqual([[1, 2, 2]]);
    expect(mode.summary).toBe("Mode per governor evaluation: busy since 06:05; 1 mode change since 21:05");
    expect(mode.table.rows.map((row) => row.cells)).toEqual([["21:05", "quiet"], ["06:05", "busy"], ["14:05", "busy"]]);
  });

  test("counts contributor tasks per hour back from the collection hour, with the fleet alongside", () => {
    const contributors = panel(view().board, "contributors");
    const chart = chartOf(view().board, "contributors");

    expect(contributors.lead).toBe("6 tasks · 2 contributor agents connected");
    expect(chart.categories).toEqual(["Mon 10:00", "Mon 11:00", "Mon 12:00", "Mon 13:00"]);

    expect(chart.series).toEqual([
      { name: "tasks", values: [1, 0, 3, 2], shape: "bar" },
      { name: "contributor agents", values: [1, 1, 2, 2], shape: "line" },
    ]);
  });

  test("leaves the contributor chart out, with a note, before Hive sends an hourly series", () => {
    const base = metrics().contributors;

    if (base === null) {
      throw new Error("The fixture has a contributors part");
    }

    const empty = panel(
      view(polled(withMetrics({ contributors: { ...base, tasksPerHour: [], fleetSize: [] } }))).board,
      "contributors",
    );

    expect(empty.lead).toBe("0 tasks · 0 contributor agents connected");
    expect(empty.chart).toBeNull();
    expect(empty.notes[0]).toEqual([{ kind: "text", text: "No hourly series from Hive yet." }]);
  });

  test("gives run times per backend only, never one figure across backends", () => {
    const runs = panel(view().board, "runs");

    expect(runs.chart?.categories).toEqual(["omp · 75 runs", "codex · 20 runs"]);

    expect(runs.chart?.series.map((series) => [series.name, series.values])).toEqual([
      ["completed", [62, 18]],
      ["failed", [9, 2]],
      ["abandoned", [4, 0]],
    ]);

    expect(runs.stats).toEqual([
      { label: "omp run time", value: "p50 6 min · p95 21 min" },
      { label: "codex run time", value: "p50 90 s · p95 not reported" },
    ]);
  });

  test("says there were no runs instead of drawing an empty chart", () => {
    const base = metrics().contributors;

    if (base === null) {
      throw new Error("The fixture has a contributors part");
    }

    const runs = panel(
      view(polled(withMetrics({ contributors: { ...base, runs7d: { total: 0, backends: [] } } }))).board,
      "runs",
    );

    expect(runs.chart).toBeNull();
    expect(runs.stats).toEqual([]);
    expect(runs.notes[0]).toEqual([{ kind: "text", text: "No runs in the last 7 days." }]);
  });

  test("gives pull requests per UTC day and the merge times, saying when nothing merged yet", () => {
    const prs = panel(view().board, "pull-requests");

    expect(prs.chart?.categories.slice(0, 2)).toEqual(["Tue 27 Oct", "Wed 28 Oct"]);
    expect(prs.chart?.series.map((series) => series.name)).toEqual(["opened", "merged", "closed unmerged"]);

    expect(prs.stats).toEqual([
      { label: "Median time to merge", value: "1.4 h" },
      { label: "p90 time to merge", value: "9 h" },
    ]);

    const base = metrics().repo;

    if (base === null) {
      throw new Error("The fixture has a repo part");
    }

    const none = panel(
      view(polled(withMetrics({ repo: { ...base, medianHoursToMerge: null, p90HoursToMerge: null } }))).board,
      "pull-requests",
    );

    expect(none.stats.map((stat) => stat.value)).toEqual(["no merges yet", "no merges yet"]);
  });

  test("states Hive's share of the merged PRs and links how authors are attributed", () => {
    const merged = panel(view().board, "merged-by");
    const links = merged.notes.flat().filter((segment) => segment.kind === "link");

    expect(merged.lead).toBe("Hive wrote 33 of 41 merged PRs");
    expect(merged.chart?.kind).toBe("stacked-bars");
    expect(merged.chart?.series.map((series) => series.name)).toEqual(["Hive", "Claude Code", "Dependabot", "other"]);
    expect(merged.notes.flat().map((segment) => segment.text).join("")).toContain("by author, not by who merged");

    expect(links).toEqual([{
      kind: "link",
      text: "How PRs are attributed",
      href: "https://github.com/Tim-van-Oudheusden/website/blob/main/docs/metrics/README.md",
    }]);
  });

  test("says no PRs were merged, without a chart, in a week with none", () => {
    const base = metrics().repo;

    if (base === null) {
      throw new Error("The fixture has a repo part");
    }

    const quiet = base.mergedBySource.map((day) => ({ ...day, hive: 0, claudeCode: 0, dependabot: 0, other: 0 }));
    const merged = panel(view(polled(withMetrics({ repo: { ...base, mergedBySource: quiet } }))).board, "merged-by");

    expect(merged.lead).toBe("No PRs were merged in the last 7 days");
    expect(merged.chart).toBeNull();
  });

  test("gives every chart a data table: one column per series and one row per point", () => {
    for (const { chart } of panels(view().board)) {
      if (chart === null) {
        continue;
      }

      expect(chart.table.rows).toHaveLength(chart.categories.length);

      for (const row of chart.table.rows) {
        expect(row.cells).toHaveLength(chart.table.header.length);
      }
    }
  });
});
