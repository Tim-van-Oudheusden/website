import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import type { EChartsCoreOption } from "echarts/core";
import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { HiveMetricsResponse } from "shared";

import { DEV_HIVE_METRICS } from "../../../../../../back-end/src/features/hive/hive-metrics-dev-fixture";
import { ChartEngineContext } from "../../../../../../front-end/src/features/agentic/components/chart-engine";
import type { ChartEngine, LoadChartEngine } from "../../../../../../front-end/src/features/agentic/components/chart-engine";
import { AGENTIC_DESIGNS, designPalette } from "../../../../../../front-end/src/features/agentic/config/agentic-designs";
import { AgenticPage } from "../../../../../../front-end/src/features/agentic/pages/agentic-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, triggerFakeMediaPreferenceChange, uninstallFakeDom } from "../../../../src/test/fake-dom";

const ORIGINAL_FETCH = globalThis.fetch;

const LIVE: HiveMetricsResponse = { state: "live", fetchedAt: "2026-11-02T14:13:25.040Z", metrics: DEV_HIVE_METRICS };

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
  triggerFakeMediaPreferenceChange(false);
});

afterAll(() => {
  uninstallFakeDom();
});

/** A chart engine that records what each chart was asked to draw, instead of loading ECharts. */
function recordingEngine(): { load: LoadChartEngine; drawn: EChartsCoreOption[][] } {
  const drawn: EChartsCoreOption[][] = [];
  const engine: ChartEngine = {
    mountChart: () => {
      const options: EChartsCoreOption[] = [];

      drawn.push(options);

      return {
        font: "serif",
        render: (option) => {
          options.push(option);
        },
        dispose: () => undefined,
      };
    },
  };

  return { load: () => Promise.resolve(engine), drawn };
}

async function mountPage(
  { search = "", body = LIVE, load = recordingEngine().load }: { search?: string; body?: HiveMetricsResponse; load?: LoadChartEngine } = {},
): Promise<{ page: FakeMount; requested: string[] }> {
  const requested = routeFetch({ "/api/hive/metrics": () => Promise.resolve(jsonResponse(body)) });
  const page = mountIntoBody(createElement(
    ChartEngineContext,
    { value: load },
    createElement(MemoryRouter, { initialEntries: [`/agentic${search}`] }, createElement(AgenticPage)),
  ));

  await act(async () => {
    await settleMicrotasks();
  });

  return { page, requested };
}

function byName(root: FakeElement, nodeName: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.nodeName === nodeName);
}

function main(page: FakeMount): FakeElement {
  const [found] = byName(page.container, "MAIN");

  if (found === undefined) {
    throw new Error("No <main>");
  }

  return found;
}

function switcherLinks(page: FakeMount): FakeElement[] {
  const nav = queryFakeElements(page.container, (el) => el.getAttribute("aria-label") === "Page design");

  return nav.flatMap((element) => byName(element, "A"));
}

describe("AgenticPage design switcher", () => {
  test("links all ten designs by ?design= and marks the one on screen", async () => {
    const { page } = await mountPage({ search: "?design=terminal" });

    try {
      const links = switcherLinks(page);

      expect(links.map((link) => link.getAttribute("href"))).toEqual(
        AGENTIC_DESIGNS.map((design) => `/agentic?design=${design.slug}`),
      );

      expect(links.filter((link) => link.getAttribute("aria-current") !== null).map((link) => link.textContent))
        .toEqual([expect.stringContaining("Terminal")]);

      expect(main(page).getAttribute("data-design")).toBe("terminal");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("shows the default design for a missing or unknown ?design=", async () => {
    for (const search of ["", "?design=canyon"]) {
      const { page } = await mountPage({ search });

      try {
        expect(main(page).getAttribute("data-design")).toBe("blueprint");
      } finally {
        unmountFakeDomRoot(page);
      }
    }
  });
});

describe("AgenticPage hive data", () => {
  test("shows every part of the hive data in every design", async () => {
    for (const design of AGENTIC_DESIGNS) {
      const { page, requested } = await mountPage({ search: `?design=${design.slug}` });

      try {
        const metrics = byName(page.container, "SECTION").find((section) => section.getAttribute("id") === "metrics");

        expect(requested).toEqual(["/api/hive/metrics"]);
        expect(byName(page.container, "H1").map((h1) => h1.textContent)).toEqual(["Agentic"]);

        expect(byName(metrics ?? page.container, "H3").map((h3) => h3.textContent)).toEqual([
          "Queue, last 18 minutes",
          "Governor mode",
          "Contributor agents, last 7 days",
          "Runs by backend, last 7 days",
          "Pull requests on this repo, last 7 days",
          "Who wrote the merged work",
        ]);

        expect(queryFakeElements(page.container, (el) => el.getAttribute("aria-label") === "Hive right now")
          .flatMap((list) => byName(list, "LI"))).toHaveLength(4);

        expect(byName(page.container, "FIGURE")).toHaveLength(6);
      } finally {
        unmountFakeDomRoot(page);
      }
    }
  });

  test("explains instead of drawing empty charts when the metrics are unavailable", async () => {
    const { page } = await mountPage({ body: { state: "unavailable", fetchedAt: null, metrics: null } });

    try {
      expect(main(page).textContent).toContain("The live numbers are not available right now");
      expect(byName(page.container, "FIGURE")).toHaveLength(0);
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});

/** The colour of the first series each chart was last drawn with: the design's accent leads every chart. */
function leadColours(drawn: readonly EChartsCoreOption[][]): unknown[] {
  return drawn.map((options) => {
    const series = options.at(-1)?.["series"];
    const [first]: unknown[] = Array.isArray(series) ? series : [];

    return typeof first === "object" && first !== null && "color" in first ? first.color : undefined;
  });
}

describe("AgenticPage charts", () => {
  test("draws each chart in the design's accent, and redraws it when the theme turns dark", async () => {
    const design = AGENTIC_DESIGNS.find((candidate) => candidate.slug === "synthwave");

    if (design === undefined) {
      throw new Error("No synthwave design");
    }

    const engine = recordingEngine();
    const { page } = await mountPage({ search: "?design=synthwave", load: engine.load });

    try {
      expect(engine.drawn).toHaveLength(6);

      expect(leadColours(engine.drawn)).toEqual(Array<string>(6).fill(designPalette(design, "light").accent));

      act(() => {
        triggerFakeMediaPreferenceChange(true);
      });

      expect(leadColours(engine.drawn)).toEqual(Array<string>(6).fill(designPalette(design, "dark").accent));
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("keeps every chart's data table, opened, when the chart library cannot load", async () => {
    const { page } = await mountPage({ load: () => Promise.reject(new Error("chunk failed")) });

    try {
      const figures = byName(page.container, "FIGURE");

      expect(figures).toHaveLength(6);

      for (const figure of figures) {
        const [details] = byName(figure, "DETAILS");

        expect(details?.hasAttribute("open")).toBe(true);
        expect(byName(details ?? figure, "TABLE")).toHaveLength(1);
      }
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});
