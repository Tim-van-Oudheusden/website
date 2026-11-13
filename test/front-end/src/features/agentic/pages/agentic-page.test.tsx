import type { Mock } from "bun:test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, spyOn, test } from "bun:test";

import { act, createElement } from "react";

import type { HiveMetricsResponse } from "shared";
import { API_BASE, ROUTES } from "shared";

import { AgenticPage } from "../../../../../../front-end/src/features/agentic/pages/agentic-page";
import type { FakeMount } from "../../../test/dom-harness";
import { initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../test/dom-harness";
import { uninstallFakeDom } from "../../../test/fake-dom";
import { liveMetrics } from "../pipeline/pipeline-model";

const ORIGINAL_FETCH = globalThis.fetch;
/** No widget, contributor or repository data: the stations then draw no ECharts canvas, which the fake DOM cannot
 * measure. */
const NO_CHARTS = { hive: null, contributors: null, repo: null };
const FETCHED_AT = Date.parse("2026-11-02T14:14:20.000Z");

interface IntervalWindow {
  setInterval: (callback: () => void, ms: number) => number;
  clearInterval: (id: number) => void;
}

/**
 * A hand-driven clock behind `Date.now` and the fake window's `setInterval`, so the test decides when the page's
 * clock ticks instead of waiting for it.
 */
interface IntervalClock {
  /** Moves `Date.now` on by `ms` and runs each interval callback once per period that elapsed. */
  advance: (ms: number) => void;
  /** Intervals still registered. */
  pending: () => number;
  restore: () => void;
}

function installIntervalClock(start: number): IntervalClock {
  const intervalWindow = window as unknown as IntervalWindow;
  const original: IntervalWindow = {
    setInterval: intervalWindow.setInterval,
    clearInterval: intervalWindow.clearInterval,
  };
  const intervals = new Map<number, { callback: () => void; every: number; next: number }>();
  let now = start;
  let nextId = 0;
  const nowSpy: Mock<() => number> = spyOn(Date, "now").mockImplementation(() => now);

  intervalWindow.setInterval = (callback, every) => {
    nextId += 1;
    intervals.set(nextId, { callback, every, next: now + every });

    return nextId;
  };

  intervalWindow.clearInterval = (id) => {
    intervals.delete(id);
  };

  return {
    advance: (ms) => {
      const end = now + ms;

      for (const interval of intervals.values()) {
        while (interval.next <= end) {
          now = interval.next;
          interval.next += interval.every;
          interval.callback();
        }
      }

      now = end;
    },
    pending: () => intervals.size,
    restore: () => {
      intervalWindow.setInterval = original.setInterval;
      intervalWindow.clearInterval = original.clearInterval;
      nowSpy.mockRestore();
    },
  };
}

describe("AgenticPage", () => {
  let clock: IntervalClock;
  let mount: FakeMount | null = null;

  beforeAll(async () => {
    await initFakeDomHarness();
  });

  beforeEach(() => {
    clock = installIntervalClock(FETCHED_AT + 40_000);
    const body: HiveMetricsResponse = { state: "live", fetchedAt: new Date(FETCHED_AT).toISOString(), metrics: liveMetrics(NO_CHARTS) };

    routeFetch({ [`${API_BASE}${ROUTES.HIVE_METRICS}`]: () => Promise.resolve(jsonResponse(body)) });
  });

  afterEach(() => {
    if (mount !== null) {
      unmountFakeDomRoot(mount);
      mount = null;
    }

    clock.restore();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  afterAll(() => {
    uninstallFakeDom();
  });

  /** Lets the metrics fetch answer and the lazily loaded view render. */
  async function settle(): Promise<void> {
    for (let round = 0; round < 10; round += 1) {
      await act(async () => {
        await settleMicrotasks();

        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });
    }
  }

  test("keeps \"updated … ago\" current between polls, re-reading the clock every 10 s", async () => {
    mount = mountIntoBody(createElement(AgenticPage));
    await settle();

    expect(mount.container.textContent).toContain("updated 40 s ago");

    act(() => {
      clock.advance(10_000);
    });

    expect(mount.container.textContent).toContain("updated 50 s ago");
  });

  test("stops the clock when the page goes away", async () => {
    mount = mountIntoBody(createElement(AgenticPage));
    await settle();

    expect(clock.pending()).toBe(1);

    unmountFakeDomRoot(mount);
    mount = null;

    expect(clock.pending()).toBe(0);
  });
});
