import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { HiveMetricsResponse, HivePublicMetrics } from "shared";

import type { HiveMetricsViewProps } from "../../../../../../front-end/src/features/agentic/components/hive-metrics-section";
import { HiveMetricsView } from "../../../../../../front-end/src/features/agentic/components/hive-metrics-section";
import type { PollingApiGetState } from "../../../../../../front-end/src/shared/hooks/use-polling-api-get";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

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

function polled(data: HiveMetricsResponse | null, stale = false): PollingApiGetState<HiveMetricsResponse> {
  return { status: data === null ? "loading" : "success", data, error: null, stale };
}

function render(props: Partial<HiveMetricsViewProps> = {}): { root: FakeElement; unmount: () => void } {
  const mount = mountIntoBody(<HiveMetricsView poll={polled(response())} now={NOW} timeZone="UTC" {...props} />);

  return { root: mount.container, unmount: () => {
    unmountFakeDomRoot(mount);
  } };
}

function byName(root: FakeElement, nodeName: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.nodeName === nodeName);
}

function withAttribute(root: FakeElement, name: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.hasAttribute(name));
}

/** The status pill: the element that holds the polite live region. */
function statusPill(root: FakeElement): { text: string; announced: string; time: FakeElement | undefined } {
  const [live, ...others] = withAttribute(root, "aria-live");

  if (live === undefined || others.length > 0) {
    throw new Error("Expected exactly one aria-live region");
  }

  const pill = live.parentElement;

  if (pill === null) {
    throw new Error("The live region has no parent pill");
  }

  return { text: pill.textContent, announced: live.textContent, time: byName(pill, "TIME")[0] };
}

describe("HiveMetricsView status pill", () => {
  test("says live with the age of the last update, and announces only the state politely", () => {
    const { root, unmount } = render();

    try {
      const pill = statusPill(root);

      expect(byName(root, "H2").map((h2) => h2.textContent)).toEqual(["The hive, live"]);
      expect(pill.text).toBe("Live · updated 40 s ago");
      expect(withAttribute(root, "aria-live")[0]?.getAttribute("aria-live")).toBe("polite");
      expect(pill.announced).toBe("Live");
      // HTML attribute names are case-insensitive; the fake DOM keeps React's spelling.
      expect(pill.time?.getAttribute("dateTime")).toBe(FETCHED_AT);
      expect(pill.time?.getAttribute("title")).toBe("2 Nov 2026, 14:05 UTC");
    } finally {
      unmount();
    }
  });

  test("says stale with the clock time of the last update when a part is old or the latest poll failed", () => {
    for (const poll of [polled(response({ state: "stale" })), polled(response(), true)]) {
      const { root, unmount } = render({ poll });

      try {
        const pill = statusPill(root);

        expect(pill.text).toBe("Stale · last update 14:05");
        expect(pill.announced).toBe("Stale");
        expect(pill.time?.getAttribute("title")).toBe("2 Nov 2026, 14:05 UTC");
      } finally {
        unmount();
      }
    }
  });

  test("says offline when Hive's health check fails, while the numbers it still has stay on screen", () => {
    const { root, unmount } = render({ poll: polled(response({ metrics: { ...metrics(), online: false } })) });

    try {
      const pill = statusPill(root);

      expect(pill.text).toBe("Offline");
      expect(pill.announced).toBe("Offline");
      expect(pill.time).toBeUndefined();
      expect(byName(root, "FIGURE").length).toBeGreaterThan(0);
    } finally {
      unmount();
    }
  });
});

/** The card titled `title`: the section its h3 heads. */
function card(root: FakeElement, title: string): FakeElement {
  const section = byName(root, "H3").find((h3) => h3.textContent === title)?.parentElement;

  if (section === null || section === undefined) {
    throw new Error(`No card titled ${title}`);
  }

  return section;
}

function headings(root: FakeElement): string[] {
  return byName(root, "H3").map((h3) => h3.textContent);
}

function withHistory(history: NonNullable<HivePublicMetrics["hive"]>["history"]): HiveMetricsResponse {
  const base = metrics();

  if (base.hive === null) {
    throw new Error("The fixture has a widget part");
  }

  return response({ metrics: { ...base, hive: { ...base.hive, history } } });
}

/** Each KPI tile's lines: label, value and detail. */
function tileLines(root: FakeElement): string[][] {
  return queryFakeElements(root, (el) => el.getAttribute("aria-label") === "Hive right now")
    .flatMap((list) => byName(list, "LI"))
    .map((li) => byName(li, "P").map((p) => p.textContent));
}

describe("HiveMetricsView KPI tiles", () => {
  test("lists four tiles from the latest widget point, and none without the widget", () => {
    const live = render();

    try {
      expect(tileLines(live.root)).toEqual([
        ["Agents running", "5 / 7", "of the agents configured"],
        ["Open work", "23", "14 issues · 9 PRs · 4 held"],
        ["Ready to merge", "6", "11 actionable"],
        ["Governor mode", "busy", "how hard Hive is working the queue"],
      ]);
    } finally {
      live.unmount();
    }

    const missing = render({ poll: polled(response({ metrics: { ...metrics(), hive: null } })) });

    try {
      expect(tileLines(missing.root)).toEqual([]);
    } finally {
      missing.unmount();
    }
  });

  test("accents only the agents tile in the hive tone, the colour of the canyon's bedrock", () => {
    const { root, unmount } = render();

    try {
      // Each tile's colours: those of its decorative (aria-hidden) parts, like a chart legend's swatches.
      const accents = queryFakeElements(root, (el) => el.getAttribute("aria-label") === "Hive right now")
        .flatMap((list) => byName(list, "LI"))
        .map((li) => [
          byName(li, "P")[0]?.textContent,
          queryFakeElements(li, (el) => el.getAttribute("aria-hidden") === "true")
            .map((part) => part.style.getPropertyValue("backgroundColor")),
        ]);

      expect(accents).toEqual([
        ["Agents running", ["var(--site-chart-hive)"]],
        ["Open work", []],
        ["Ready to merge", []],
        ["Governor mode", []],
      ]);
    } finally {
      unmount();
    }
  });
});

describe("HiveMetricsView footnote", () => {
  test("links Hive and this repo's multi-agent guide, and says what is deliberately not published", () => {
    const { root, unmount } = render({ poll: polled({ state: "unavailable", fetchedAt: null, metrics: null }) });

    try {
      const [footer] = byName(root, "FOOTER");

      expect(footer?.textContent).toContain("Repository names, agent names, cost and logs are deliberately not published.");

      expect(byName(footer ?? root, "A").map((a) => a.getAttribute("href"))).toEqual([
        "https://github.com/hivecommons/hive",
        "https://github.com/Tim-van-Oudheusden/website/blob/main/docs/multi-agent.md",
      ]);
    } finally {
      unmount();
    }
  });
});

describe("HiveMetricsView charts", () => {
  test("titles the queue with the span its history measured, never an assumed one", () => {
    const cases = [
      { history: metrics().hive?.history ?? [], title: "Queue, last 17 hours" },
      {
        history: [
          { t: "2026-11-02T13:55:48.679Z", mode: "idle" as const, issues: 3, prs: 2, held: 5 },
          { t: "2026-11-02T14:13:25.040Z", mode: "quiet" as const, issues: 2, prs: 6, held: 26 },
        ],
        title: "Queue, last 18 minutes",
      },
      {
        history: [
          { t: "2026-10-31T14:00:00.000Z", mode: "idle" as const, issues: 3, prs: 2, held: 5 },
          { t: "2026-11-02T14:00:00.000Z", mode: "quiet" as const, issues: 2, prs: 6, held: 26 },
        ],
        title: "Queue, last 2 days",
      },
    ];

    for (const { history, title } of cases) {
      const { root, unmount } = render({ poll: polled(withHistory(history)) });

      try {
        expect(headings(root)).toContain(title);
      } finally {
        unmount();
      }
    }
  });

  test("draws the contributor bars and their legend in the hive tone, the colour of the canyon's bedrock", () => {
    const { root, unmount } = render();

    try {
      const contributors = card(root, "Contributor agents, last 7 days");
      const bars = byName(contributors, "RECT").map((rect) => rect.style.getPropertyValue("fill"));
      const swatches = byName(contributors, "LI").flatMap((li) => byName(li, "SPAN"))
        .map((swatch) => [swatch.parentElement?.textContent, swatch.style.getPropertyValue("backgroundColor")]);

      expect(bars).toHaveLength(4);
      expect(new Set(bars)).toEqual(new Set(["var(--site-chart-hive)"]));
      expect(swatches).toEqual([["tasks", "var(--site-chart-hive)"]]);
    } finally {
      unmount();
    }
  });

  test("gives run times per backend only, never one figure across backends", () => {
    const { root, unmount } = render();

    try {
      const runs = card(root, "Runs by backend, last 7 days");

      expect(byName(runs, "FIGCAPTION").map((caption) => caption.textContent)).toEqual(["omp · 75 runs", "codex · 20 runs"]);

      expect(byName(runs, "P").map((p) => p.textContent)).toEqual([
        "omp run time: p50 6 min · p95 21 min",
        "codex run time: p50 90 s · p95 not reported",
        "Percentiles are per backend; they are never added up or averaged across backends.",
      ]);

      expect(runs.textContent.match(/p50/g)).toHaveLength(2);
    } finally {
      unmount();
    }
  });

  test("states Hive's share of the merged PRs, says how authors are attributed and links the rule", () => {
    const { root, unmount } = render();

    try {
      const merged = card(root, "Who wrote the merged work");
      const links = byName(merged, "A").map((a) => a.getAttribute("href"));

      expect(byName(merged, "P")[0]?.textContent).toBe("Hive wrote 33 of 41 merged PRs");
      expect(merged.textContent).toContain("by author, not by who merged");
      expect(links).toEqual(["https://github.com/Tim-van-Oudheusden/website/blob/main/docs/metrics/README.md"]);
    } finally {
      unmount();
    }
  });
});

describe("HiveMetricsView degraded parts", () => {
  test("replaces only the cards of a missing part with one line, and keeps the rest", () => {
    const cases = [
      {
        missing: { hive: null },
        line: "Live queue data is not connected right now.",
        gone: ["Queue, last 17 hours", "Governor mode"],
        kept: ["Contributor agents, last 7 days", "Runs by backend, last 7 days", "Pull requests on this repo, last 7 days", "Who wrote the merged work"],
      },
      {
        missing: { contributors: null },
        line: "Contributor agent data is not available right now.",
        gone: ["Contributor agents, last 7 days", "Runs by backend, last 7 days"],
        kept: ["Queue, last 17 hours", "Governor mode", "Pull requests on this repo, last 7 days", "Who wrote the merged work"],
      },
      {
        missing: { repo: null },
        line: "Pull request data for this repo is not available right now.",
        gone: ["Pull requests on this repo, last 7 days", "Who wrote the merged work"],
        kept: ["Queue, last 17 hours", "Governor mode", "Contributor agents, last 7 days", "Runs by backend, last 7 days"],
      },
    ];

    for (const { missing, line, gone, kept } of cases) {
      const { root, unmount } = render({ poll: polled(response({ metrics: { ...metrics(), ...missing } })) });

      try {
        expect(byName(root, "P").map((p) => p.textContent)).toContain(line);
        expect(headings(root)).toEqual(expect.arrayContaining(kept));

        for (const title of gone) {
          expect(headings(root)).not.toContain(title);
        }
      } finally {
        unmount();
      }
    }
  });

  test("says it is connecting, without charts, until the first poll lands", () => {
    const { root, unmount } = render({ poll: polled(null) });

    try {
      expect(statusPill(root).text).toBe("Connecting");
      expect(byName(root, "P").map((p) => p.textContent)).toContain("Loading the live numbers…");
      expect(byName(root, "FIGURE")).toHaveLength(0);
    } finally {
      unmount();
    }
  });

  test("shows one short explanation and no empty charts when nothing is available", () => {
    const explanation = "The live numbers are not available right now: this site cannot reach Hive or GitHub. "
      + "They fill in on their own once it can.";
    const unavailable = polled({ state: "unavailable", fetchedAt: null, metrics: null });
    const polls: PollingApiGetState<HiveMetricsResponse>[] = [
      unavailable,
      polled(response({ metrics: { ...metrics(), hive: null, contributors: null, repo: null } })),
      { status: "error", data: null, error: "Failed to reach back-end", stale: false },
    ];

    for (const poll of polls) {
      const { root, unmount } = render({ poll });

      try {
        expect(byName(root, "P").map((p) => p.textContent)).toContain(explanation);
        expect(byName(root, "FIGURE")).toHaveLength(0);
        expect(headings(root)).toHaveLength(0);
      } finally {
        unmount();
      }
    }

    const { root, unmount } = render({ poll: unavailable });

    try {
      expect(statusPill(root).text).toBe("Offline");
    } finally {
      unmount();
    }
  });
});
