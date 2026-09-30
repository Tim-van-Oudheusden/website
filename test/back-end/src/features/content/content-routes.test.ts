import { describe, expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { API_BASE, ROUTES } from "shared";
import { buildApp } from "../../../../../back-end/src/app";

const ARTICLE_MARKDOWN = [
  "---",
  "title: Hello World",
  "publishDate: 2026-01-02",
  "type: article",
  "category: Introduction",
  "---",
  "# Hello World",
].join("\n");

/**
 * Content routes: JSON endpoints live under API_BASE; the image route stays
 * at the root because it is a static asset path, not an API call.
 */
describe("content routes mount JSON under /api and images at the root", () => {
  let app: FastifyInstance | null = null;
  let contentDir: string;

  beforeAll(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-content-"));
    await mkdir(join(contentDir, "images"), { recursive: true });
    await writeFile(join(contentDir, "images", "pixel.png"), "fake-image-bytes");
    await writeFile(join(contentDir, "hello-world.md"), ARTICLE_MARKDOWN);

    app = await buildApp({ logger: false, contentDir });
    await app.ready();
  });

  afterAll(async () => {
    if (app !== null) {
      await app.close();
    }
    await rm(contentDir, { recursive: true, force: true });
  });

  test(`GET ${API_BASE}${ROUTES.CONTENT} lists content items`, async () => {
    const res = await app!.inject({ method: "GET", url: `${API_BASE}${ROUTES.CONTENT}` });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
    expect(body[0].title).toBe("Hello World");
  });

  test(`GET ${API_BASE}${ROUTES.CONTENT_BY_SLUG} resolves one item`, async () => {
    const url = `${API_BASE}${ROUTES.CONTENT_BY_SLUG.replace(":slug", "hello-world")}`;
    const res = await app!.inject({ method: "GET", url });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe("Hello World");
  });

  test("GET /content at the root no longer serves JSON", async () => {
    const res = await app!.inject({ method: "GET", url: ROUTES.CONTENT });
    expect(res.statusCode).toBe(404);
  });

  test("serves content images at the root /content-assets/images/*", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/pixel.png" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["cache-control"]).toContain("immutable");
  });

  test("unknown content image returns 404", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/missing.png" });
    expect(res.statusCode).toBe(404);
  });

  test("path traversal outside the image root is rejected", async () => {
    const res = await app!.inject({
      method: "GET",
      url: "/content-assets/images/%2e%2e/%2e%2e/passwd",
    });
    expect(res.statusCode).toBe(404);
  });
});