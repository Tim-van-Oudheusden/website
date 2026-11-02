import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { HiveMetricsResponse } from "shared";

import { DEV_HIVE_METRICS } from "../../../../../../back-end/src/features/hive/hive-metrics-dev-fixture";
import { HiveMetricsView } from "../../../../../../front-end/src/features/agentic/components/hive-metrics-section";
import { AGENTIC_DESIGNS, designPalette } from "../../../../../../front-end/src/features/agentic/config/agentic-designs";
import { buildHiveView } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
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
const NOW = Date.parse(FETCHED_AT) + 40_000;
const PALETTE = designPalette(AGENTIC_DESIGNS[0]!, "light");

function polled(data: HiveMetricsResponse | null): PollingApiGetState<HiveMetricsResponse> {
  return { status: data === null ? "loading" : "success", data, error: null, stale: false };
}

function render(data: HiveMetricsResponse | null): { root: FakeElement; unmount: () => void } {
  const view = buildHiveView(polled(data), NOW, "UTC");
  const mount = mountIntoBody(<HiveMetricsView view={view} palette={PALETTE} animate={false} />);

  return { root: mount.container, unmount: () => {
    unmountFakeDomRoot(mount);
  } };
}

function byName(root: FakeElement, nodeName: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.nodeName === nodeName);
}

describe("HiveMetricsView", () => {
  test("announces only the status word politely, with the absolute time behind the age", () => {
    const { root, unmount } = render({ state: "live", fetchedAt: FETCHED_AT, metrics: DEV_HIVE_METRICS });

    try {
      const [live, ...others] = queryFakeElements(root, (el) => el.hasAttribute("aria-live"));
      const [time] = byName(live?.parentElement ?? root, "TIME");

      expect(others).toHaveLength(0);
      expect(live?.getAttribute("aria-live")).toBe("polite");
      expect(live?.textContent).toBe("Live");
      expect(live?.parentElement?.textContent).toBe("Live · updated 40 s ago");
      // HTML attribute names are case-insensitive; the fake DOM keeps React's spelling.
      expect(time?.getAttribute("dateTime")).toBe(FETCHED_AT);
      expect(time?.getAttribute("title")).toBe("2 Nov 2026, 14:05 UTC");
    } finally {
      unmount();
    }
  });

  test("names each chart's takeaway as an image, beside a caption and a data table", () => {
    const { root, unmount } = render({ state: "live", fetchedAt: FETCHED_AT, metrics: DEV_HIVE_METRICS });

    try {
      for (const figure of byName(root, "FIGURE")) {
        const [caption] = byName(figure, "FIGCAPTION");
        const images = queryFakeElements(figure, (el) => el.getAttribute("role") === "img");

        expect(images).toHaveLength(1);
        expect(images[0]?.getAttribute("aria-label")).toStartWith(`${caption?.textContent ?? "?"}: `);
        expect(byName(figure, "SUMMARY").map((summary) => summary.textContent)).toEqual(["Show data"]);
      }
    } finally {
      unmount();
    }
  });

  test("stands one line in for a missing part and keeps the others", () => {
    const { root, unmount } = render({ state: "live", fetchedAt: FETCHED_AT, metrics: { ...DEV_HIVE_METRICS, repo: null } });

    try {
      expect(byName(root, "P").map((p) => p.textContent)).toContain("Pull request data for this repo is not available right now.");

      expect(byName(root, "H3").map((h3) => h3.textContent)).toEqual([
        "Queue, last 18 minutes",
        "Governor mode",
        "Contributor agents, last 7 days",
        "Runs by backend, last 7 days",
      ]);
    } finally {
      unmount();
    }
  });

  test("says it is connecting, without a board, until the first poll lands", () => {
    const { root, unmount } = render(null);

    try {
      expect(byName(root, "P").map((p) => p.textContent)).toContain("Loading the live numbers…");
      expect(byName(root, "FIGURE")).toHaveLength(0);
      expect(byName(root, "H3")).toHaveLength(0);
    } finally {
      unmount();
    }
  });

  test("links Hive and this repo's multi-agent guide, and says what is deliberately not published", () => {
    const { root, unmount } = render({ state: "unavailable", fetchedAt: null, metrics: null });

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
