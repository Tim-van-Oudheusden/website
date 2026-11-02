import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { HivePublicMetrics } from "shared";

import type { HiveUpstream } from "../../../../../back-end/src/features/hive/hive-public-metrics";
import { buildHivePublicMetrics } from "../../../../../back-end/src/features/hive/hive-public-metrics";

/** Reads a sanitised upstream sample (live Hive, 2026-11-02) seeded with canaries. */
function fixture(name: string): unknown {
  return JSON.parse(readFileSync(join(import.meta.dir, "fixtures", `${name}.json`), "utf8"));
}

function fixtureUpstream(): HiveUpstream {
  return {
    health: fixture("health"),
    widget: fixture("widget-summary"),
    contributeMetrics: fixture("contribute-metrics"),
    runStats: fixture("run-stats"),
  };
}

/** Every key path in a JSON value; array elements share the `[]` segment. */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => keyPaths(item, `${prefix}[]`));
  }

  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [
      `${prefix}.${key}`,
      ...keyPaths(child, `${prefix}.${key}`),
    ]);
  }

  return [];
}

describe("buildHivePublicMetrics allowlist", () => {
  test("drops every canary and keeps exactly the contract's keys", () => {
    const serialised = JSON.stringify(buildHivePublicMetrics(fixtureUpstream()));

    for (const canary of [
      "CANARY",
      "runtime",
      "heap_inuse_bytes",
      "hiveId",
      "repos",
      "agentStats",
      "agents_kicked",
      "per_user",
      "queue_depth",
      "models",
      "scenarios",
      "chrome_idle_share",
    ]) {
      expect(serialised).not.toContain(canary);
    }

    expect([...new Set(keyPaths(JSON.parse(serialised)))].sort()).toEqual(
      [
        ".online",
        ".hive",
        ".hive.mode",
        ".hive.agents",
        ".hive.agents.total",
        ".hive.agents.running",
        ".hive.work",
        ".hive.work.issues",
        ".hive.work.prs",
        ".hive.work.held",
        ".hive.work.actionable",
        ".hive.work.mergeable",
        ".hive.history",
        ".hive.history[].t",
        ".hive.history[].mode",
        ".hive.history[].issues",
        ".hive.history[].prs",
        ".hive.history[].held",
        ".contributors",
        ".contributors.collectedAt",
        ".contributors.tasksPerHour",
        ".contributors.fleetSize",
        ".contributors.runs7d",
        ".contributors.runs7d.total",
        ".contributors.runs7d.backends",
        ".contributors.runs7d.backends[].backend",
        ".contributors.runs7d.backends[].completed",
        ".contributors.runs7d.backends[].failed",
        ".contributors.runs7d.backends[].abandoned",
        ".contributors.runs7d.backends[].p50Seconds",
        ".contributors.runs7d.backends[].p95Seconds",
      ].sort(),
    );
  });
});

describe("buildHivePublicMetrics online", () => {
  test("is true only when health reports status ok", () => {
    function online(health: unknown): boolean {
      return buildHivePublicMetrics({ ...fixtureUpstream(), health }).online;
    }

    expect(online({ status: "ok" })).toBe(true);
    expect(online({ status: "degraded" })).toBe(false);
    expect(online({ status: "OK" })).toBe(false);
    expect(online({})).toBe(false);
    expect(online(null)).toBe(false);
    expect(online("ok")).toBe(false);
  });
});

/** A well-formed widget history point; Hive sends `t` in epoch milliseconds. */
function point(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    t: Date.UTC(2026, 10, 2, 12),
    govMode: "BUSY",
    govIssues: 4,
    govPrs: 3,
    govHold: 2,
    actionableCount: 1,
    mergeableCount: 1,
    ...overrides,
  };
}

function hiveFrom(widget: unknown): HivePublicMetrics["hive"] {
  return buildHivePublicMetrics({ ...fixtureUpstream(), widget }).hive;
}

describe("buildHivePublicMetrics hive", () => {
  test("maps the widget summary to lower-cased modes, agent counts, latest work and ISO history", () => {
    expect(buildHivePublicMetrics(fixtureUpstream()).hive).toEqual({
      mode: "quiet",
      agents: { total: 16, running: 14 },
      work: { issues: 2, prs: 6, held: 26, actionable: 2, mergeable: 0 },
      history: [
        { t: "2026-11-02T13:55:48.679Z", mode: "idle", issues: 3, prs: 2, held: 5 },
        { t: "2026-11-02T14:05:04.808Z", mode: "idle", issues: 2, prs: 3, held: 26 },
        { t: "2026-11-02T14:13:25.040Z", mode: "quiet", issues: 2, prs: 6, held: 26 },
      ],
    });
  });

  test("counts only running agents among Hive's states idle, running, stopped, failed and paused", () => {
    const agents = ["idle", "running", "stopped", "failed", "paused", "running"].map((state, index) => ({
      name: `CANARY-AGENT-${index}`,
      state,
    }));

    expect(hiveFrom({ agents, history: [point({})] })?.agents).toEqual({ total: 6, running: 2 });
  });

  test("skips history points with an unknown governor mode", () => {
    const earlier = Date.UTC(2026, 10, 2, 11);
    const later = Date.UTC(2026, 10, 2, 12);
    const hive = hiveFrom({
      agents: [],
      history: [point({ t: earlier, govMode: "SURGE" }), point({ t: later, govMode: "TURBO", govIssues: 9 })],
    });

    expect(hive?.mode).toBe("surge");
    expect(hive?.history).toEqual([{ t: new Date(earlier).toISOString(), mode: "surge", issues: 4, prs: 3, held: 2 }]);
  });

  test("takes the tiles from the latest point by time and lists history oldest first", () => {
    const hours = [12, 10, 11].map((hour) => Date.UTC(2026, 10, 2, hour));
    const hive = hiveFrom({
      agents: [],
      history: [
        point({ t: hours[0], govMode: "SURGE", govIssues: 12, actionableCount: 7, mergeableCount: 5 }),
        point({ t: hours[1], govMode: "IDLE", govIssues: 10 }),
        point({ t: hours[2], govMode: "QUIET", govIssues: 11 }),
      ],
    });

    expect(hive?.mode).toBe("surge");
    expect(hive?.work).toEqual({ issues: 12, prs: 3, held: 2, actionable: 7, mergeable: 5 });

    expect(hive?.history.map((entry) => [entry.t, entry.issues])).toEqual([
      ["2026-11-02T10:00:00.000Z", 10],
      ["2026-11-02T11:00:00.000Z", 11],
      ["2026-11-02T12:00:00.000Z", 12],
    ]);
  });

  test("is null when the widget summary is unavailable, while contributors still build", () => {
    const metrics = buildHivePublicMetrics({ ...fixtureUpstream(), widget: null });

    expect(metrics.hive).toBeNull();
    expect(metrics.contributors).not.toBeNull();
  });
});

function runStatsBackend(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    backend: "omp",
    total: 10,
    completed: 8,
    failed: 1,
    abandoned: 1,
    scenarios: { verdict_complete: 8 },
    chrome_idle_share: 0,
    duration_p50_s: 300.5,
    duration_p95_s: 900.25,
    ...overrides,
  };
}

describe("buildHivePublicMetrics contributors", () => {
  test("maps contributor series and keeps run percentiles per backend, never combined", () => {
    const runStats = {
      backends: [
        runStatsBackend({}),
        runStatsBackend({ backend: "claude", completed: 3, failed: 0, abandoned: 2, duration_p50_s: 60, duration_p95_s: 120 }),
      ],
      models: [{ model: "CANARY-MODEL", runs: 15 }],
      total: 15,
      window_days: 7,
    };

    expect(buildHivePublicMetrics({ ...fixtureUpstream(), runStats }).contributors).toEqual({
      collectedAt: "2026-11-02T13:00:00.000Z",
      tasksPerHour: [1, 1, 1, 0, 1, 0],
      fleetSize: [1, 1, 1, 1, 1, 1],
      runs7d: {
        total: 15,
        backends: [
          { backend: "omp", completed: 8, failed: 1, abandoned: 1, p50Seconds: 300.5, p95Seconds: 900.25 },
          { backend: "claude", completed: 3, failed: 0, abandoned: 2, p50Seconds: 60, p95Seconds: 120 },
        ],
      },
    });
  });

  test("is null when either contributor endpoint is unavailable, while hive still builds", () => {
    for (const missing of [{ contributeMetrics: null }, { runStats: null }]) {
      const metrics = buildHivePublicMetrics({ ...fixtureUpstream(), ...missing });

      expect(metrics.contributors).toBeNull();
      expect(metrics.hive).not.toBeNull();
    }
  });
});

describe("buildHivePublicMetrics malformed upstream values", () => {
  test("skips malformed history points and blanks hive without agents or usable points", () => {
    const good = point({ t: Date.UTC(2026, 10, 2, 9) });
    const hive = hiveFrom({
      agents: [{ state: "running" }],
      history: [
        good,
        point({ t: Date.UTC(2026, 10, 2, 10), govIssues: "4" }),
        point({ t: Date.UTC(2026, 10, 2, 11), govPrs: Number.NaN }),
        point({ t: Date.UTC(2026, 10, 2, 12), govHold: -1 }),
        point({ t: Date.UTC(2026, 10, 2, 13), actionableCount: 1.5 }),
        point({ t: Date.UTC(2026, 10, 2, 14), mergeableCount: null }),
        point({ t: "2026-11-02T15:00:00Z" }),
        point({ t: Number.POSITIVE_INFINITY }),
        point({ govMode: 3 }),
        null,
        "point",
      ],
    });

    expect(hive?.history).toEqual([{ t: "2026-11-02T09:00:00.000Z", mode: "busy", issues: 4, prs: 3, held: 2 }]);
    expect(hiveFrom({ agents: [], history: [point({ govMode: "TURBO" })] })).toBeNull();
    expect(hiveFrom({ agents: [], history: "none" })).toBeNull();
    expect(hiveFrom({ agents: "none", history: [good] })).toBeNull();
    expect(hiveFrom("widget")).toBeNull();
  });

  test("blanks only the malformed contributor field or part, never NaN and never throwing", () => {
    const metrics = fixture("contribute-metrics") as Record<string, unknown>;
    const runStats = fixture("run-stats") as Record<string, unknown>;

    function contributors(contributeMetrics: unknown, stats: unknown = runStats): HivePublicMetrics["contributors"] {
      return buildHivePublicMetrics({ ...fixtureUpstream(), contributeMetrics, runStats: stats }).contributors;
    }

    const unaligned = contributors({ ...metrics, fleet_size: [1, 2] });

    expect(unaligned?.tasksPerHour).toEqual([]);
    expect(unaligned?.fleetSize).toEqual([]);
    expect(contributors({ ...metrics, tasks_done: [1, Number.NaN, 1, 0, 1, 0] })?.tasksPerHour).toEqual([]);
    expect(contributors({ ...metrics, fleet_size: undefined })?.fleetSize).toEqual([]);

    expect(contributors({ ...metrics, collected_at: "yesterday" })).toBeNull();
    expect(contributors({ ...metrics, collected_at: 1793628805040 })).toBeNull();
    expect(contributors({ ...metrics }, { ...runStats, total: -1 })).toBeNull();
    expect(contributors("metrics")).toBeNull();

    expect(contributors(metrics, { ...runStats, backends: "omp" })?.runs7d.backends).toEqual([]);

    expect(
      contributors(metrics, {
        ...runStats,
        backends: [
          runStatsBackend({ duration_p50_s: "fast", duration_p95_s: Number.NaN }),
          runStatsBackend({ backend: 7 }),
          runStatsBackend({ completed: -2 }),
          runStatsBackend({ failed: null }),
          null,
        ],
      })?.runs7d.backends,
    ).toEqual([{ backend: "omp", completed: 8, failed: 1, abandoned: 1, p50Seconds: null, p95Seconds: null }]);
  });

  test("never throws for unusable payloads", () => {
    for (const junk of [undefined, null, 0, "x", [], {}, [[]]]) {
      expect(
        buildHivePublicMetrics({ health: junk, widget: junk, contributeMetrics: junk, runStats: junk }),
      ).toEqual({ online: false, hive: null, contributors: null });
    }
  });
});
