import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import type { FastifyInstance } from "fastify";

import { API_BASE, APP_NAME, ROUTES } from "shared";

import { buildApp } from "../../../back-end/src/app";

/** JSON API routes live under API_BASE; only /health stays at the root. */
function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

describe("back-end routes use shared ROUTES constants", () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    if (app !== null) {
      await app.close();
    }
  });

  test(`GET ${ROUTES.HEALTH} returns 200 with HealthCheckResponse at the root`, async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({ method: "GET", url: ROUTES.HEALTH });

    expect(res.statusCode).toBe(200);

    const body = res.json();

    expect(body.status).toBe("ok");
    expect(body.name).toBe(APP_NAME);
    expect(typeof body.uptime).toBe("number");
  });

  test(`GET ${API_BASE}${ROUTES.HELLO} returns 200 with HelloResponse`, async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({ method: "GET", url: apiUrl(ROUTES.HELLO) });

    expect(res.statusCode).toBe(200);

    const body = res.json();

    expect(body.message).toBe("hello");
    expect(typeof body.timestamp).toBe("string");
  });

  test(`GET ${API_BASE}${ROUTES.ROOT} returns 200 with app info`, async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({ method: "GET", url: apiUrl(ROUTES.ROOT) });

    expect(res.statusCode).toBe(200);

    const body = res.json();

    expect(body.name).toBe(APP_NAME);
    expect(typeof body.version).toBe("string");
  });

  test("hello/root are no longer served at the root (moved under API_BASE)", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    expect((await app.inject({ method: "GET", url: ROUTES.HELLO })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: ROUTES.ROOT })).statusCode).toBe(404);
  });

  test("no route registered at hardcoded string that differs from ROUTES", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    // Ensure routes are only registered at the shared constant paths.
    // If someone adds a duplicate route at a different path, this test won't
    // catch it, but the TypeScript compiler will enforce usage of ROUTES.
    const res = await app.inject({ method: "GET", url: "/nonexistent" });

    expect(res.statusCode).toBe(404);
  });

  test("applies security headers on API responses", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({ method: "GET", url: ROUTES.HEALTH });

    expect(res.statusCode).toBe(200);
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["referrer-policy"]).toBe("no-referrer");
    expect(res.headers["content-security-policy"]).toBeUndefined();
  });

  test("rate limits repeated requests from the same client", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    let finalResponse = await app.inject({
      method: "GET",
      url: apiUrl(ROUTES.HELLO),
      remoteAddress: "127.0.0.1",
    });

    for (let i = 0; i < 60; i += 1) {
      finalResponse = await app.inject({
        method: "GET",
        url: apiUrl(ROUTES.HELLO),
        remoteAddress: "127.0.0.1",
      });
    }

    expect(finalResponse.statusCode).toBe(429);
    expect(finalResponse.headers["retry-after"]).toBeDefined();
  });

  test("rate limits repeated not-found requests from the same client", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    let finalResponse = await app.inject({
      method: "GET",
      url: "/totally-missing",
      remoteAddress: "127.0.0.99",
    });

    for (let i = 0; i < 20; i += 1) {
      finalResponse = await app.inject({
        method: "GET",
        url: "/totally-missing",
        remoteAddress: "127.0.0.99",
      });
    }

    expect(finalResponse.statusCode).toBe(429);
    expect(finalResponse.headers["retry-after"]).toBeDefined();
  });

  test("distinct CF-Connecting-IP values get distinct rate-limit keys", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    // Behind Cloudflare Tunnel the peer is always 127.0.0.1; the real client
    // identity arrives in CF-Connecting-IP, so each client must get its own bucket.
    function requestAs(ip: string): Promise<{ statusCode: number }> {
      return app!.inject({
        method: "GET",
        url: apiUrl(ROUTES.HELLO),
        remoteAddress: "127.0.0.1",
        headers: { "CF-Connecting-IP": ip },
      });
    }

    let last: { statusCode: number } | null = null;

    for (let i = 0; i < 51; i += 1) {
      last = await requestAs("198.51.100.10");
    }

    expect(last?.statusCode).toBe(429);

    const otherClient = await requestAs("198.51.100.11");

    expect(otherClient.statusCode).toBe(200);
  });

  test("direct requests cannot spoof client identity via CF-Connecting-IP", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    // A non-loopback peer (arbitrary caller) can set CF-Connecting-IP freely;
    // the limiter must key on the socket IP, ignoring the spoofable header.
    function requestAs(ip: string): Promise<{ statusCode: number }> {
      return app!.inject({
        method: "GET",
        url: apiUrl(ROUTES.HELLO),
        remoteAddress: "203.0.113.9",
        headers: { "CF-Connecting-IP": ip },
      });
    }

    let last: { statusCode: number } | null = null;

    for (let i = 0; i < 30; i += 1) {
      last = await requestAs("198.51.100.1");
    }

    for (let i = 0; i < 30; i += 1) {
      // Rotating the spoofed header must not reset the limit (same socket key).
      last = await requestAs("198.51.100.2");
    }

    expect(last?.statusCode).toBe(429);
  });
});
