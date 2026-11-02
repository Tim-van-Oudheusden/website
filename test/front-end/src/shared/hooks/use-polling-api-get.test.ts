import { afterAll, afterEach, beforeAll, describe, expect, jest, test } from "bun:test";

import { act, createElement } from "react";

import type { PollingApiGetState } from "../../../../../front-end/src/shared/hooks/use-polling-api-get";
import {
  initialPollingApiGetState,
  reducePollingApiGetState,
  usePollingApiGet,
} from "../../../../../front-end/src/shared/hooks/use-polling-api-get";
import { initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../src/test/dom-harness";
import { setFakeDocumentVisibility, uninstallFakeDom } from "../../../src/test/fake-dom";

interface Metrics {
  value: number;
}

const ORIGINAL_FETCH = globalThis.fetch;
const MINUTE = 60_000;

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  jest.useRealTimers();
  setFakeDocumentVisibility("visible");
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

interface ProbeHandle {
  latest: () => PollingApiGetState<Metrics> | null;
  cleanup: () => void;
}

/** Mounts a component that mirrors the hook result into a ref holder. */
function mountProbe(): ProbeHandle {
  const latestRef: { current: PollingApiGetState<Metrics> | null } = { current: null };

  function Probe(): null {
    latestRef.current = usePollingApiGet<Metrics>("/polled");

    return null;
  }

  const mount = mountIntoBody(createElement(Probe));

  return {
    latest: () => latestRef.current,
    cleanup: () => {
      unmountFakeDomRoot(mount);
    },
  };
}

async function settle(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();
  });
}

/** Advance the fake clock and let any fetch it started settle. */
async function advance(ms: number): Promise<void> {
  act(() => {
    jest.advanceTimersByTime(ms);
  });

  await settle();
}

/** Answer `/api/polled` with an increasing `value` per request; returns the requested URLs. */
function countingFetch(): string[] {
  let value = 0;

  return routeFetch({
    "/api/polled": () => {
      value += 1;

      return Promise.resolve(jsonResponse({ value }));
    },
  });
}

describe("usePollingApiGet state machine", () => {
  test("an error after a success keeps the data and marks it stale", () => {
    const fresh = reducePollingApiGetState<Metrics>(initialPollingApiGetState(), { type: "success", data: { value: 1 } });

    const failed = reducePollingApiGetState(fresh, { type: "error", error: "Request failed: Bad Gateway" });

    expect(failed).toEqual({ status: "error", data: { value: 1 }, error: "Request failed: Bad Gateway", stale: true });
  });

  test("a success after a failed poll replaces the data and clears stale", () => {
    const stale = { status: "error" as const, data: { value: 1 }, error: "Request failed: Bad Gateway", stale: true };

    const recovered = reducePollingApiGetState<Metrics>(stale, { type: "success", data: { value: 2 } });

    expect(recovered).toEqual({ status: "success", data: { value: 2 }, error: null, stale: false });
  });

  test("an error before any success has no data and nothing stale", () => {
    const failed = reducePollingApiGetState<Metrics>(initialPollingApiGetState(), { type: "error", error: "Failed to reach back-end" });

    expect(failed).toEqual({ status: "error", data: null, error: "Failed to reach back-end", stale: false });
  });
});

describe("usePollingApiGet polling", () => {
  test("fetches on mount, then again every 60 s while the tab is visible", async () => {
    const requested = countingFetch();

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await settle();
      expect(requested).toHaveLength(1);
      expect(probe.latest()?.data).toEqual({ value: 1 });

      await advance(MINUTE - 1);
      expect(requested).toHaveLength(1);

      await advance(1);
      expect(requested).toHaveLength(2);
      expect(probe.latest()?.data).toEqual({ value: 2 });

      await advance(MINUTE);
      expect(requested).toHaveLength(3);
    } finally {
      probe.cleanup();
    }
  });

  test("a failed poll keeps the last data on screen and marks it stale", async () => {
    let fail = false;

    routeFetch({
      "/api/polled": () => Promise.resolve(
        fail
          ? new Response("Bad Gateway", { status: 502, statusText: "Bad Gateway" })
          : jsonResponse({ value: 1 }),
      ),
    });

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await settle();
      fail = true;
      await advance(MINUTE);

      expect(probe.latest()).toEqual({ status: "error", data: { value: 1 }, error: "Request failed: Bad Gateway", stale: true });
    } finally {
      probe.cleanup();
    }
  });

  test("does not poll while the tab is hidden", async () => {
    const requested = countingFetch();

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await settle();

      act(() => {
        setFakeDocumentVisibility("hidden");
      });

      await advance(5 * MINUTE);
      expect(requested).toHaveLength(1);
    } finally {
      probe.cleanup();
    }
  });

  test("fetches at once when the tab comes back after more than 60 s, then resumes polling", async () => {
    const requested = countingFetch();

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await settle();

      act(() => {
        setFakeDocumentVisibility("hidden");
      });

      await advance(2 * MINUTE);

      act(() => {
        setFakeDocumentVisibility("visible");
      });

      await settle();
      expect(requested).toHaveLength(2);
      expect(probe.latest()?.data).toEqual({ value: 2 });

      await advance(MINUTE);
      expect(requested).toHaveLength(3);
    } finally {
      probe.cleanup();
    }
  });

  test("a tab hidden only briefly does not fetch at once and keeps the 60 s cadence", async () => {
    const requested = countingFetch();

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await settle();
      await advance(10_000);

      act(() => {
        setFakeDocumentVisibility("hidden");
      });

      await advance(20_000);

      act(() => {
        setFakeDocumentVisibility("visible");
      });

      await settle();
      expect(requested).toHaveLength(1);

      await advance(MINUTE - 30_000);
      expect(requested).toHaveLength(2);
    } finally {
      probe.cleanup();
    }
  });

  test("stops polling and listening for visibility on unmount", async () => {
    const requested = countingFetch();

    jest.useFakeTimers();
    const probe = mountProbe();

    await settle();
    probe.cleanup();

    await advance(5 * MINUTE);

    act(() => {
      setFakeDocumentVisibility("hidden");
      setFakeDocumentVisibility("visible");
    });

    await settle();

    expect(requested).toHaveLength(1);
  });

  test("a slow poll that settles after a newer one never replaces the newer data", async () => {
    const pending: ((response: Response) => void)[] = [];

    routeFetch({
      "/api/polled": () => {
        const { promise, resolve } = Promise.withResolvers<Response>();

        pending.push(resolve);

        return promise;
      },
    });

    jest.useFakeTimers();
    const probe = mountProbe();

    try {
      await advance(MINUTE);
      expect(pending).toHaveLength(2);

      pending[1]?.(jsonResponse({ value: 2 }));
      await settle();
      pending[0]?.(jsonResponse({ value: 1 }));
      await settle();

      expect(probe.latest()?.data).toEqual({ value: 2 });
    } finally {
      probe.cleanup();
    }
  });
});
