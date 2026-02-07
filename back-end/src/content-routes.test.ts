import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import { resolve } from "path";
import { ROUTES } from "shared";
import { registerContentRoutes } from "./content-routes";

const CONTENT_DIR = resolve(import.meta.dirname, "../../content");

describe("content API routes", () => {
  const app = Fastify({ logger: false });
  registerContentRoutes(app, CONTENT_DIR);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  test(`GET ${ROUTES.CONTENT} returns 200 with array of content items`, async () => {
    const res = await app.inject({ method: "GET", url: ROUTES.CONTENT });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    if (!Array.isArray(body)) {
      throw new Error("Expected list response body to be an array");
    }
    expect(body.length).toBeGreaterThan(0);

    const first = body[0];
    if (first === undefined || typeof first !== "object" || first === null) {
      throw new Error("Expected first list item to be an object");
    }
    expect(first).toMatchObject({ title: "Hello World", slug: "hello-world" });
    expect(first).not.toHaveProperty("body");
  });

  test("GET /content/hello-world returns 200 with content item and body", async () => {
    const res = await app.inject({ method: "GET", url: "/content/hello-world" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toMatchObject({ title: "Hello World", slug: "hello-world" });
    if (typeof body !== "object" || body === null || !("body" in body)) {
      throw new Error("Expected content response body to include markdown body");
    }
    expect(body.body).toContain("# Hello World");
  });

  test("GET /content/nonexistent returns 404", async () => {
    const res = await app.inject({ method: "GET", url: "/content/nonexistent" });
    expect(res.statusCode).toBe(404);
  });

  test("GET /content?type=article returns only articles", async () => {
    const res = await app.inject({ method: "GET", url: "/content?type=article" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    if (!Array.isArray(body)) {
      throw new Error("Expected filtered list response body to be an array");
    }
    expect(body.length).toBeGreaterThan(0);
    for (const item of body) {
      expect(item).toHaveProperty("type", "article");
    }
  });

  test("GET /content?type=project returns empty array (no projects in test data)", async () => {
    const res = await app.inject({ method: "GET", url: "/content?type=project" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toEqual([]);
  });

  test("GET /content-assets/images/pixel.gif returns image bytes", async () => {
    const res = await app.inject({ method: "GET", url: "/content-assets/images/pixel.gif" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/gif");
    expect(res.body.length).toBeGreaterThan(0);
  });

  test("GET /content-assets/images/missing.gif returns 404", async () => {
    const res = await app.inject({ method: "GET", url: "/content-assets/images/missing.gif" });
    expect(res.statusCode).toBe(404);
  });

  test("GET /content-assets/images/%2e%2e/%2e%2e/hello-world.md returns 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/content-assets/images/%2e%2e/%2e%2e/hello-world.md",
    });
    expect(res.statusCode).toBe(404);
  });
});
