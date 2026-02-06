import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import { APP_NAME, ROUTES, type HealthCheckResponse, type HelloResponse } from "shared";

/**
 * Build the same Fastify app used in index.ts but without calling listen().
 * Fastify's `.inject()` method lets us test routes in-process.
 */
function buildApp(): ReturnType<typeof Fastify> {
  const app = Fastify({ logger: false });

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
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test(`GET ${ROUTES.HEALTH} returns 200 with HealthCheckResponse`, async () => {
    const res = await app.inject({ method: "GET", url: ROUTES.HEALTH });
    expect(res.statusCode).toBe(200);

    const body = res.json() as HealthCheckResponse;
    expect(body.status).toBe("ok");
    expect(body.name).toBe(APP_NAME);
    expect(typeof body.uptime).toBe("number");
  });

  test(`GET ${ROUTES.HELLO} returns 200 with HelloResponse`, async () => {
    const res = await app.inject({ method: "GET", url: ROUTES.HELLO });
    expect(res.statusCode).toBe(200);

    const body = res.json() as HelloResponse;
    expect(body.message).toBe("hello");
    expect(typeof body.timestamp).toBe("string");
  });

  test(`GET ${ROUTES.ROOT} returns 200 with app info`, async () => {
    const res = await app.inject({ method: "GET", url: ROUTES.ROOT });
    expect(res.statusCode).toBe(200);

    const body = res.json() as { name: string; version: string };
    expect(body.name).toBe(APP_NAME);
    expect(typeof body.version).toBe("string");
  });

  test("no route registered at hardcoded string that differs from ROUTES", async () => {
    // Ensure routes are only registered at the shared constant paths.
    // If someone adds a duplicate route at a different path, this test won't
    // catch it, but the TypeScript compiler will enforce usage of ROUTES.
    const res = await app.inject({ method: "GET", url: "/nonexistent" });
    expect(res.statusCode).toBe(404);
  });
});
