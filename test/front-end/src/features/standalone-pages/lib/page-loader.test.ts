import { afterEach, describe, expect, mock, test } from "bun:test";

import { API_BASE } from "shared";

import { fetchPage } from "../../../../../../front-end/src/features/standalone-pages/lib/page-loader";

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe("fetchPage", () => {
  test("encodes the slug so URL syntax in it cannot name another page", async () => {
    const fetchMock = mock((_url: string) => Promise.resolve(new Response(null, { status: 404 })));

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;

    expect(await fetchPage("now?x#y/z")).toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_BASE}/pages/now%3Fx%23y%2Fz`);
  });
});
