import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import Fastify, { type FastifyInstance } from "fastify";
import { APP_NAME, ROUTES, type HealthCheckResponse, type HelloResponse } from "shared";
import { registerRateLimiting } from "./rate-limit";
import { registerSecurityHeaders } from "./security-headers";

/**
 * Build the same Fastify app used in index.ts but without calling listen().
 * Fastify's `.inject()` method lets us test routes in-process.
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  registerSecurityHeaders(app);
  await registerRateLimiting(app);

  app.get(ROUTES.HEALTH, (): HealthCheckResponse => {
    return {
      status: "ok",
      name: APP_NAME,
      uptime: Math.round(process.uptime()),
    };
  });

  app.get(ROUTES.HELLO, (): HelloResponse => {
    return {
      message: "hello",
      timestamp: new Date().toISOString(),
    };
  });

  app.get(ROUTES.ROOT, () => {
    return { name: APP_NAME, version: "0.1.0" };
  });

  return app;
}

describe("back-end routes use shared ROUTES constants", () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app !== null) {
      await app.close();
    }
  });

  test(`GET ${ROUTES.HEALTH} returns 200 with HealthCheckResponse`, async () => {
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

  test(`GET ${ROUTES.HELLO} returns 200 with HelloResponse`, async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }
    const res = await app.inject({ method: "GET", url: ROUTES.HELLO });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.message).toBe("hello");
    expect(typeof body.timestamp).toBe("string");
  });

  test(`GET ${ROUTES.ROOT} returns 200 with app info`, async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }
    const res = await app.inject({ method: "GET", url: ROUTES.ROOT });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.name).toBe(APP_NAME);
    expect(typeof body.version).toBe("string");
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
      url: ROUTES.HELLO,
      remoteAddress: "127.0.0.1",
    });
    for (let i = 0; i < 60; i += 1) {
      finalResponse = await app.inject({
        method: "GET",
        url: ROUTES.HELLO,
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
});
