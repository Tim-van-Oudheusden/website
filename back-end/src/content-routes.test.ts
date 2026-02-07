import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import Fastify from "fastify";
import { tmpdir } from "os";
import { resolve } from "path";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { ROUTES } from "shared";
import { registerContentRoutes } from "./content-routes";

const ARTICLE_SLUG = "route-test-article";
const PROJECT_SLUG = "route-test-project";
const ARTICLE_TITLE = "Route Test Article";

describe("content API routes", () => {
  const app = Fastify({ logger: false });
  let tempContentDir = "";

  beforeAll(async () => {
    tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-routes-"));
    await mkdir(resolve(tempContentDir, "images"), { recursive: true });

    await writeFile(
      resolve(tempContentDir, "route-test-article.md"),
      [
        "---",
        `title: ${ARTICLE_TITLE}`,
        "description: test article",
        "date: 2026-02-07T12:00:00Z",
        "tags:",
        "  - route-test",
        "type: article",
        "draft: false",
        `slug: ${ARTICLE_SLUG}`,
        "---",
        "",
        "# Route Test Article",
        "",
        "Body",
      ].join("\n"),
    );

    await writeFile(
      resolve(tempContentDir, "route-test-project.md"),
      [
        "---",
        "title: Route Test Project",
        "description: test project",
        "date: 2026-02-08T12:00:00Z",
        "tags:",
        "  - route-test",
        "type: project",
        "draft: false",
        `slug: ${PROJECT_SLUG}`,
        "---",
        "",
        "# Route Test Project",
      ].join("\n"),
    );

    await writeFile(
      resolve(tempContentDir, "images", "pixel.gif"),
      Buffer.from("GIF89a", "ascii"),
    );

    registerContentRoutes(app, tempContentDir);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await rm(tempContentDir, { recursive: true, force: true });
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

    const article = body.find(
      (item) => typeof item === "object" && item !== null && "slug" in item && item.slug === ARTICLE_SLUG,
    );
    if (article === undefined) {
      throw new Error("Expected list response to include route test article");
    }
    expect(article).toMatchObject({ title: ARTICLE_TITLE, slug: ARTICLE_SLUG });
    expect(article).not.toHaveProperty("body");
  });

  test("GET /content/:slug returns 200 with content item and body", async () => {
    const res = await app.inject({ method: "GET", url: `/content/${ARTICLE_SLUG}` });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body).toMatchObject({ title: ARTICLE_TITLE, slug: ARTICLE_SLUG });
    if (typeof body !== "object" || body === null || !("body" in body)) {
      throw new Error("Expected content response body to include markdown body");
    }
    expect(body.body).toContain("# Route Test Article");
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

  test("GET /content?type=project returns only projects", async () => {
    const res = await app.inject({ method: "GET", url: "/content?type=project" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    if (!Array.isArray(body)) {
      throw new Error("Expected filtered list response body to be an array");
    }
    expect(body).toHaveLength(1);
    expect(body[0]).toHaveProperty("slug", PROJECT_SLUG);
    expect(body[0]).toHaveProperty("type", "project");
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

  test("GET /content-assets/images/%2e%2e/%2e%2e/secret.md returns 404", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/content-assets/images/%2e%2e/%2e%2e/secret.md",
    });
    expect(res.statusCode).toBe(404);
  });
});
