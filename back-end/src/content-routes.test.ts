import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import { resolve } from "path";
import { ROUTES } from "shared";
import { registerContentRoutes } from "./content-routes";
import type { ContentItem, ContentListItem } from "./content";

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

    const body = res.json() as ContentListItem[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);

    const first = body[0]!;
    expect(first.title).toBe("Hello World");
    expect(first.slug).toBe("hello-world");
    expect(first).not.toHaveProperty("body");
  });

  test("GET /content/hello-world returns 200 with content item and body", async () => {
    const res = await app.inject({ method: "GET", url: "/content/hello-world" });
    expect(res.statusCode).toBe(200);

    const body = res.json() as ContentItem;
    expect(body.title).toBe("Hello World");
    expect(body.slug).toBe("hello-world");
    expect(body.body).toContain("# Hello World");
  });

  test("GET /content/nonexistent returns 404", async () => {
    const res = await app.inject({ method: "GET", url: "/content/nonexistent" });
    expect(res.statusCode).toBe(404);
  });

  test("GET /content?type=article returns only articles", async () => {
    const res = await app.inject({ method: "GET", url: "/content?type=article" });
    expect(res.statusCode).toBe(200);

    const body = res.json() as ContentListItem[];
    expect(body.length).toBeGreaterThan(0);
    for (const item of body) {
      expect(item.type).toBe("article");
    }
  });

  test("GET /content?type=project returns empty array (no projects in test data)", async () => {
    const res = await app.inject({ method: "GET", url: "/content?type=project" });
    expect(res.statusCode).toBe(200);

    const body = res.json() as ContentListItem[];
    expect(body).toEqual([]);
  });
});
