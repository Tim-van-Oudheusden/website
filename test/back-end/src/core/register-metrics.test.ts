import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { resolve } from "node:path";

import type { FastifyInstance } from "fastify";

import { API_BASE, ROUTES } from "shared";

import { buildApp } from "../../../../back-end/src/app";
import { resetMetrics } from "../../../../back-end/src/core/metrics";

const REAL_CONTENT_DIR = resolve(import.meta.dir, "../../../../content");

describe("/metrics", () => {
  let app: FastifyInstance | null = null;

  beforeAll(async () => {
    app = await buildApp({ logger: false, contentDir: REAL_CONTENT_DIR });
    await app.ready();
  });

  afterEach(() => {
    resetMetrics();
  });

  afterAll(async () => {
    if (app !== null) {
      await app.close();
    }
  });

  test("is not reachable from a non-loopback caller", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({
      method: "GET",
      url: "/metrics",
      remoteAddress: "203.0.113.9",
    });

    expect(res.statusCode).toBe(404);
  });

  test("exposes counters for a loopback caller, labeled by route pattern", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    await app.inject({
      method: "GET",
      url: `${API_BASE}${ROUTES.HELLO}`,
      remoteAddress: "127.0.0.1",
    });

    const res = await app.inject({
      method: "GET",
      url: "/metrics",
      remoteAddress: "127.0.0.1",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");

    const body = res.body;

    expect(body).toContain("http_requests_total");
    expect(body).toContain(`route="${API_BASE}${ROUTES.HELLO}"`);
    expect(body).toContain("http_request_duration_seconds_bucket");
    // The raw path never leaks as a label — only the matched route pattern does.
    expect(body).not.toContain("route=\"/metrics\"");
  });

  test("does not leak unmatched raw paths as unbounded labels", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    await app.inject({
      method: "GET",
      url: "/this-path-does-not-exist-12345",
      remoteAddress: "127.0.0.1",
    });

    const res = await app.inject({
      method: "GET",
      url: "/metrics",
      remoteAddress: "127.0.0.1",
    });

    expect(res.body).toContain("route=\"unmatched\"");
    expect(res.body).not.toContain("this-path-does-not-exist-12345");
  });
});
