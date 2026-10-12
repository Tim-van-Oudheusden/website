import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";

import { API_BASE } from "shared";

import { recordView } from "../../../../../front-end/src/shared/lib/record-view";

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("recordView", () => {
  test("POSTs the view beacon for the slug", () => {
    const fetchMock = mock(() => Promise.resolve(new Response(null, { status: 204 })));

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
    recordView("hello world");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];

    expect(url).toBe(`${API_BASE}/views/hello%20world`);
    expect(init.method).toBe("POST");
  });

  test("swallows network failures so a blocked beacon never breaks the page", async () => {
    const warnSpy = spyOn(console, "warn");

    try {
      globalThis.fetch = mock(() => Promise.reject(new Error("offline"))) as unknown as typeof globalThis.fetch;

      expect(() => {
        recordView("a");
      }).not.toThrow();

      await Promise.resolve();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test("logs a warning with the slug and error when the beacon fails", async () => {
    const warnSpy = spyOn(console, "warn");
    const thrown = new Error("offline");

    try {
      globalThis.fetch = mock(() => Promise.reject(thrown)) as unknown as typeof globalThis.fetch;
      recordView("a");

      await Promise.resolve();
      await Promise.resolve();

      expect(warnSpy).toHaveBeenCalledWith("[record-view] failed to record a view for \"a\":", thrown);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
