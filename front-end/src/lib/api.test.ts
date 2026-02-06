import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { API_BASE, ROUTES } from "shared";
import { apiGet, apiFetch, ApiError } from "./api";

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
    globalThis.fetch = fetchMock as typeof globalThis.fetch;
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

  test("constructed URL matches the expected proxy pattern", async () => {
    await apiGet(ROUTES.HELLO);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    // The Vite proxy strips API_BASE, leaving just ROUTES.HELLO for the back-end
    const backendPath = url.replace(API_BASE, "");
    expect(backendPath).toBe(ROUTES.HELLO);
  });

  test("throws ApiError on non-ok response", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Not Found", { status: 404, statusText: "Not Found" }),
      ),
    ) as typeof globalThis.fetch;

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
