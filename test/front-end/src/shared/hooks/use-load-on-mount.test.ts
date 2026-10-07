import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";

import type { ApiGetState } from "../../../../../front-end/src/shared/hooks/use-api-get";
import { ApiError } from "../../../../../front-end/src/shared/lib/api";
import { initFakeDomHarness, mountIntoBody, settleMicrotasks, unmountFakeDomRoot } from "../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../src/test/fake-dom";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so the
// hook is imported after the fake DOM is installed by the harness.
type UseLoadOnMountFn = <T>(load: (() => Promise<T>) | null, fallbackError: string) => ApiGetState<T>;
let useLoadOnMount: UseLoadOnMountFn;

beforeAll(async () => {
  await initFakeDomHarness();
  const hookMod = await import("../../../../../front-end/src/shared/hooks/use-load-on-mount");

  useLoadOnMount = hookMod.useLoadOnMount;
});

afterAll(() => {
  uninstallFakeDom();
});

interface ProbeHandle {
  latest: () => ApiGetState<string> | null;
  cleanup: () => void;
}

/** Mounts a component that mirrors the hook result into a ref holder. */
function mountProbe(load: () => Promise<string>): ProbeHandle {
  const latestRef: { current: ApiGetState<string> | null } = { current: null };

  function Probe(): null {
    latestRef.current = useLoadOnMount(load, "Failed to load things");

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

function neverSettles(): Promise<string> {
  return new Promise<string>(() => undefined);
}

function loadsThings(): Promise<string> {
  return Promise.resolve("things");
}

function failsWithApiError(): Promise<string> {
  return Promise.reject(new ApiError("Request failed: Bad Gateway", 502));
}

function failsInTransport(): Promise<string> {
  return Promise.reject(new TypeError("network dropped"));
}

describe("useLoadOnMount", () => {
  test("is loading on the first render, before the load settles", () => {
    const probe = mountProbe(neverSettles);

    try {
      expect(probe.latest()).toEqual({ status: "loading", data: null, error: null });
    } finally {
      probe.cleanup();
    }
  });

  test("loads on mount without being asked and settles into success", async () => {
    const probe = mountProbe(loadsThings);

    try {
      await settle();

      expect(probe.latest()).toEqual({ status: "success", data: "things", error: null });
    } finally {
      probe.cleanup();
    }
  });

  test("surfaces the message of an ApiError", async () => {
    const probe = mountProbe(failsWithApiError);

    try {
      await settle();

      expect(probe.latest()).toEqual({ status: "error", data: null, error: "Request failed: Bad Gateway" });
    } finally {
      probe.cleanup();
    }
  });

  test("shows the caller's fallback message instead of a transport error's own message", async () => {
    const probe = mountProbe(failsInTransport);

    try {
      await settle();

      expect(probe.latest()).toEqual({ status: "error", data: null, error: "Failed to load things" });
    } finally {
      probe.cleanup();
    }
  });
});

interface ReloadableProbe {
  latest: () => ApiGetState<string> | null;
  rerender: (load: (() => Promise<string>) | null) => void;
  cleanup: () => void;
}

function mountReloadableProbe(initial: (() => Promise<string>) | null): ReloadableProbe {
  const latestRef: { current: ApiGetState<string> | null } = { current: null };

  function Probe({ load }: { load: (() => Promise<string>) | null }): null {
    latestRef.current = useLoadOnMount(load, "Failed to load things");

    return null;
  }

  const mount = mountIntoBody(createElement(Probe, { load: initial }));

  return {
    latest: () => latestRef.current,
    rerender: (load) => {
      act(() => {
        mount.root.render(createElement(Probe, { load }));
      });
    },
    cleanup: () => {
      unmountFakeDomRoot(mount);
    },
  };
}

function loadsSecond(): Promise<string> {
  return Promise.resolve("second");
}

describe("useLoadOnMount with a changing load", () => {
  test("is idle while there is nothing to load, then loads once a load is given", async () => {
    const probe = mountReloadableProbe(null);

    try {
      await settle();
      expect(probe.latest()).toEqual({ status: "idle", data: null, error: null });

      probe.rerender(loadsThings);
      expect(probe.latest()?.status).toBe("loading");

      await settle();
      expect(probe.latest()).toEqual({ status: "success", data: "things", error: null });
    } finally {
      probe.cleanup();
    }
  });

  test("a new load reads as loading at once and never shows the previous result", async () => {
    const probe = mountReloadableProbe(loadsThings);

    try {
      await settle();
      expect(probe.latest()?.data).toBe("things");

      probe.rerender(neverSettles);
      expect(probe.latest()).toEqual({ status: "loading", data: null, error: null });
    } finally {
      probe.cleanup();
    }
  });

  test("a superseded load that settles late is ignored", async () => {
    const firstRequest: { resolve: ((value: string) => void) | null } = { resolve: null };

    function first(): Promise<string> {
      return new Promise<string>((resolve) => {
        firstRequest.resolve = resolve;
      });
    }

    const probe = mountReloadableProbe(first);

    try {
      probe.rerender(loadsSecond);
      await settle();
      firstRequest.resolve?.("first");
      await settle();

      expect(probe.latest()).toEqual({ status: "success", data: "second", error: null });
    } finally {
      probe.cleanup();
    }
  });
});
