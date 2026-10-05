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
    await writeFile(join(contentDir, "images", "pixel.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\"/>");
    await writeFile(join(contentDir, "images", "sample.jpg"), "jpeg-bytes");
    await writeFile(join(contentDir, "images", "sample.jpeg"), "jpeg-bytes");
    await writeFile(join(contentDir, "images", "sample.gif"), "gif-bytes");
    await writeFile(join(contentDir, "images", "sample.webp"), "webp-bytes");
    await writeFile(join(contentDir, "images", "sample.avif"), "avif-bytes");
    await writeFile(join(contentDir, "images", "notes.txt"), "not an image");
    await mkdir(join(contentDir, "images", "subdir"), { recursive: true });
    await writeFile(join(contentDir, "images", "subdir", "nested.png"), "fake-image-bytes");
    await mkdir(join(contentDir, "images", "nested.png"), { recursive: true });
    await writeFile(join(contentDir, "images", "nested.png", "inner.txt"), "inside a dir that passes the MIME guard");
    await writeFile(join(contentDir, "escape.png"), "outside-root-image");
    await writeFile(join(contentDir, "hello-world.md"), ARTICLE_MARKDOWN);
    await writeFile(join(contentDir, "bad-status.md"), [
      "---",
      "title: Bad Status",
      "date: 2026-01-01",
      "type: project",
      "coverImage: /img.png",
      "coverImageAlt: img",
      "status: In development",
      "---",
      "# Bad Status",
    ].join("\n"));

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

  test("requesting the images directory returns 404, not 500", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/subdir/" });
    expect(res.statusCode).toBe(404);
  });

  test("requesting a directory with an image extension returns 404, not 500", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/nested.png/" });
    expect(res.statusCode).toBe(404);
  });

  test("rejects encoded dot-segment traversal at routing", async () => {
    const res = await app!.inject({
      method: "GET",
      url: "/content-assets/images/%2e%2e/%2e%2e/passwd",
    });
    expect(res.statusCode).toBe(404);
  });

  test("blocks decoded ../ escapes that leave the image root", async () => {
    const res = await app!.inject({
      method: "GET",
      url: "/content-assets/images/..%2fescape.png",
    });
    expect(res.statusCode).toBe(404);
    const decodedBody = res.json();
    expect(decodedBody).toEqual({ error: "Image not found" });
  });

  test("blocks double-slash absolute path escapes", async () => {
    const res = await app!.inject({
      method: "GET",
      url: "/content-assets/images//etc/passwd",
    });
    expect(res.statusCode).toBe(404);
    const decodedBody = res.json();
    expect(decodedBody).toEqual({ error: "Image not found" });
  });

  test("serves an svg with the correct mime type", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/pixel.svg" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("image/svg+xml");
  });

  test("serves every supported image extension with its MIME type", async () => {
    const contentTypeByExtension: Record<string, string> = {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".avif": "image/avif",
    };
    const fixtureName: Record<string, string> = {
      ".png": "pixel",
      ".jpg": "sample",
      ".jpeg": "sample",
      ".gif": "sample",
      ".webp": "sample",
      ".svg": "pixel",
      ".avif": "sample",
    };
    for (const extension of Object.keys(contentTypeByExtension)) {
      const res = await app!.inject({
        method: "GET",
        url: `/content-assets/images/${fixtureName[extension]}${extension}`,
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers["content-type"]).toContain(contentTypeByExtension[extension]);
    }
  });

  test("unknown file extensions are not served", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/notes.txt" });
    expect(res.statusCode).toBe(404);
  });

  test("rejects a non-image extension even when it resolves inside the root", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/pixel.md" });
    expect(res.statusCode).toBe(404);
  });

  test("rejects double-encoded traversal that survives a single decode", async () => {
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/%252e%252e%252fpasswd" });
    expect(res.statusCode).toBe(404);
  });

  test("answers 404, not 500, for a malformed escape that survives the router's decode", async () => {
    // Fastify decodes %25 to "%", so the handler receives "%.png" and
    // decodeURIComponent would throw a URIError without the resolver's guard.
    const res = await app!.inject({ method: "GET", url: "/content-assets/images/%25.png" });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body).toEqual({ error: "Image not found" });
  });

  test("invalid documents are skipped, not fatal to the list route", async () => {
    const res = await app!.inject({ method: "GET", url: `${API_BASE}${ROUTES.CONTENT}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().map((item: { slug: string }) => item.slug)).toEqual(["hello-world"]);
  });

  test("invalid documents resolve to 404 by slug", async () => {
    const url = `${API_BASE}${ROUTES.CONTENT_BY_SLUG.replace(":slug", "bad-status")}`;
    const res = await app!.inject({ method: "GET", url });
    expect(res.statusCode).toBe(404);
  });
});