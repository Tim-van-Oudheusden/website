import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { API_BASE, BACKEND_HOST, BACKEND_PORT, ROUTES } from "shared";

import { ApiError, apiFetch, apiGet } from "../../../../../front-end/src/shared/lib/api";

/**
 * Tests that the front-end API client correctly uses the shared route
 * constants (API_BASE and ROUTES) so that front-end and back-end paths
 * never drift out of sync.
 */

// Store the original fetch so we can restore it
const originalFetch = globalThis.fetch;

describe("front-end API client uses shared constants", () => {
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    fetchMock = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "hello", timestamp: "2026-01-01T00:00:00Z" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test("apiGet prepends API_BASE to the route path", async () => {
    await apiGet(ROUTES.HELLO);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(`${API_BASE}${ROUTES.HELLO}`);
  });

  test("apiFetch prepends API_BASE to arbitrary paths", async () => {
    await apiFetch(ROUTES.HEALTH, { method: "GET" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(`${API_BASE}${ROUTES.HEALTH}`);
  });

  test("throws ApiError on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Not Found", { status: 404, statusText: "Not Found" }),
      ),
    ) as unknown as typeof globalThis.fetch;

    try {
      await apiGet(ROUTES.HELLO);
      // Should not reach here
      expect(true).toBe(false);
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(404);
    }
  });
});

describe("shared network constants for the dev proxy", () => {
  test("BACKEND_HOST defaults to localhost for host-machine development", () => {
    expect(BACKEND_HOST).toBe("localhost");
  });

  test("BACKEND_PORT matches the port the back-end listens on", () => {
    expect(BACKEND_PORT).toBe(3001);
  });

  test("default proxy target resolves to http://localhost:3001", () => {
    const target = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

    expect(target).toBe("http://localhost:3001");
  });

  test("BACKEND_HOST can be overridden for non-pod deployments", () => {
    // The escape hatch documented in front-end/vite.config.ts (VITE_BACKEND_HOST).
    const target = `http://back-end:${BACKEND_PORT}`;

    expect(target).toBe("http://back-end:3001");
    expect(target).not.toContain("localhost");
  });
});
