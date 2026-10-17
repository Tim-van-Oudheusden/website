import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { act, createElement } from "react";

import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../src/test/fake-dom";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so the
// hook is imported after the fake DOM is installed by the harness.
type UseRecordViewFn = (slug: string | null) => void;
let useRecordView: UseRecordViewFn;

beforeAll(async () => {
  await initFakeDomHarness();
  const hookMod = await import("../../../../../front-end/src/shared/hooks/use-record-view");

  useRecordView = hookMod.useRecordView;
});

afterAll(() => {
  uninstallFakeDom();
});

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

function beaconPaths(): string[] {
  const fetchMock = globalThis.fetch as unknown as { mock: { calls: unknown[][] } };

  return fetchMock.mock.calls
    .filter(([, init]) => (init as RequestInit | undefined)?.method === "POST")
    .map(([url]) => String(url));
}

function mountProbe(initialSlug: string | null): { rerender: (slug: string | null) => void; cleanup: () => void } {
  function Probe({ slug }: { slug: string | null }): null {
    useRecordView(slug);

    return null;
  }

  const mount = mountIntoBody(createElement(Probe, { slug: initialSlug }));

  return {
    rerender: (slug) => {
      act(() => {
        mount.root.render(createElement(Probe, { slug }));
      });
    },
    cleanup: () => {
      unmountFakeDomRoot(mount);
    },
  };
}

describe("useRecordView", () => {
  test("records nothing while the slug is null", () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 204 })));

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const probe = mountProbe(null);

    try {
      expect(beaconPaths()).toHaveLength(0);
    } finally {
      probe.cleanup();
    }
  });

  test("fires the beacon once a slug is available", () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 204 })));

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const probe = mountProbe("hello-world");

    try {
      expect(beaconPaths()).toEqual([expect.stringContaining("/views/hello-world")]);
    } finally {
      probe.cleanup();
    }
  });

  test("fires again when the slug changes, but not on a re-render with the same slug", () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 204 })));

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    const probe = mountProbe("first");

    try {
      probe.rerender("first");
      expect(beaconPaths()).toHaveLength(1);

      probe.rerender("second");

      expect(beaconPaths()).toEqual([
        expect.stringContaining("/views/first"),
        expect.stringContaining("/views/second"),
      ]);
    } finally {
      probe.cleanup();
    }
  });
});
