import { afterEach, describe, expect, mock, test } from "bun:test";

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
    globalThis.fetch = mock(() => Promise.reject(new Error("offline"))) as unknown as typeof globalThis.fetch;

    expect(() => {
      recordView("a");
    }).not.toThrow();

    await Promise.resolve();
  });
});
