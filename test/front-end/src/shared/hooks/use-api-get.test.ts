import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";
import { act, createElement } from "react";
import type {
  ApiGetAction,
  ApiGetState,
  UseApiGetResult,
} from "../../../../../front-end/src/shared/hooks/use-api-get";

import { uninstallFakeDom } from "../../../src/test/fake-dom";
import {
  initFakeDomHarness,
  jsonResponse,
  mountIntoBody,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../src/test/dom-harness";

interface HelloData {
  message: string;
  timestamp: string;
}

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so it
// must be imported after the fake DOM is installed by the harness.
type InitialApiGetStateFn = <T>() => ApiGetState<T>;
type ReduceApiGetStateFn = <T>(state: ApiGetState<T>, action: ApiGetAction<T>) => ApiGetState<T>;
type UseApiGetFn = <T>(path: string) => UseApiGetResult<T>;
let useApiGet: UseApiGetFn;
let initialApiGetState: InitialApiGetStateFn;
let reduceApiGetState: ReduceApiGetStateFn;

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
  const hookMod = await import(
    "../../../../../front-end/src/shared/hooks/use-api-get"
  );

  useApiGet = hookMod.useApiGet;
  initialApiGetState = hookMod.initialApiGetState;
  reduceApiGetState = hookMod.reduceApiGetState;
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

describe("useApiGet state machine", () => {
  test("starts idle with no data or error", () => {
    expect(initialApiGetState<HelloData>()).toEqual({ status: "idle", data: null, error: null });
  });

  test("transitions to loading on start, clearing prior data and error", () => {
    const loading = reduceApiGetState(
      { status: "success", data: { message: "old", timestamp: "t" }, error: null },
      { type: "start" },
    );

    expect(loading).toEqual({ status: "loading", data: null, error: null });
  });

  test("transitions loading -> success carrying the fetched data", () => {
    const data = { message: "hello", timestamp: "2026-01-01T00:00:00Z" };

    const success = reduceApiGetState(
      { status: "loading", data: null, error: null },
      { type: "success", data },
    );

    expect(success).toEqual({ status: "success", data, error: null });
  });

  test("transitions loading -> error carrying a message", () => {
    const failure = reduceApiGetState(
      { status: "loading", data: null, error: null },
      { type: "error", error: "Failed to reach back-end" },
    );

    expect(failure).toEqual({ status: "error", data: null, error: "Failed to reach back-end" });
  });
});

describe("useApiGet hook lifecycle", () => {
  interface ProbeHandle {
    latest: () => UseApiGetResult<HelloData> | null;
    cleanup: () => void;
  }

  /** Mounts a component that mirrors the hook result into a ref holder. */
  function mountProbe(): ProbeHandle {
    const latestRef: { current: UseApiGetResult<HelloData> | null } = { current: null };

    function Probe(): null {
      latestRef.current = useApiGet<HelloData>("/hello");

      return null;
    }

    const mount: FakeMount = mountIntoBody(createElement(Probe));

    return {
      latest: () => latestRef.current,
      cleanup: () => {
        unmountFakeDomRoot(mount);
      },
    };
  }

  test("starts idle, then settles into success with the fetched data", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ message: "hello", timestamp: "2026-01-01T00:00:00Z" })),
    ) as unknown as typeof globalThis.fetch;

    const probe = mountProbe();

    try {
      expect(probe.latest()?.status).toBe("idle");
      expect(probe.latest()?.data).toBeNull();
      expect(probe.latest()?.error).toBeNull();

      await act(async () => {
        await probe.latest()?.refetch();
      });

      expect(probe.latest()?.status).toBe("success");
      expect(probe.latest()?.data).toEqual({ message: "hello", timestamp: "2026-01-01T00:00:00Z" });
      expect(probe.latest()?.error).toBeNull();
    } finally {
      probe.cleanup();
    }
  });

  test("surfaces the ApiError message on failure and clears stale data", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(jsonResponse({ message: "stale", timestamp: "2026-01-01T00:00:00Z" })),
    ) as unknown as typeof globalThis.fetch;

    const probe = mountProbe();

    try {
      await act(async () => {
        await probe.latest()?.refetch();
      });

      expect(probe.latest()?.status).toBe("success");

      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("Internal Server Error", { status: 500, statusText: "Internal Server Error" })),
      ) as unknown as typeof globalThis.fetch;

      await act(async () => {
        await probe.latest()?.refetch();
      });

      expect(probe.latest()?.status).toBe("error");
      expect(probe.latest()?.error).toBe("Request failed: Internal Server Error");
      // A failed refetch never leaves the previous success result behind.
      expect(probe.latest()?.data).toBeNull();
    } finally {
      probe.cleanup();
    }
  });

  test("surfaces a transport Error message when the request never completes", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new TypeError("network dropped")),
    ) as unknown as typeof globalThis.fetch;

    const probe = mountProbe();

    try {
      await act(async () => {
        await probe.latest()?.refetch();
      });

      expect(probe.latest()?.status).toBe("error");
      expect(probe.latest()?.error).toBe("network dropped");
      expect(probe.latest()?.data).toBeNull();
    } finally {
      probe.cleanup();
    }
  });

  test("falls back to a generic message when the transport rejects with a non-Error", async () => {
    // Error-shaped but not an Error instance (e.g. a cross-realm or plain-object
    // rejection): its message must not leak, the generic fallback is shown.
    const errorLike = { name: "Error", message: "offline" } as Error;

    globalThis.fetch = mock(() => Promise.reject(errorLike)) as unknown as typeof globalThis.fetch;
    const probe = mountProbe();

    try {
      await act(async () => {
        await probe.latest()?.refetch();
      });

      expect(probe.latest()?.status).toBe("error");
      expect(probe.latest()?.error).toBe("Failed to reach back-end");
    } finally {
      probe.cleanup();
    }
  });
});
