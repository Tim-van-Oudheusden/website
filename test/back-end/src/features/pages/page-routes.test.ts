import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";

import type { PageData } from "shared";
import { API_BASE, ROUTES } from "shared";

import { buildApp } from "../../../../../back-end/src/app";

function pageUrl(slug: string): string {
  return `${API_BASE}${ROUTES.PAGE_BY_SLUG.replace(":slug", slug)}`;
}

/**
 * Standalone pages (/now, /uses) are markdown files under content/pages/,
 * served by slug and kept out of the article/project listing.
 */
describe("GET /api/pages/:slug", () => {
  let app: FastifyInstance | null = null;
  let contentDir: string;

  beforeAll(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-pages-"));
    await mkdir(join(contentDir, "pages"), { recursive: true });

    await writeFile(join(contentDir, "pages", "now.md"), [
      "---",
      "title: Now",
      "description: What I am focused on at the moment.",
      "updated: 2026-10-01",
      "---",
      "Building things. ![[photo.png]]",
    ].join("\n"));

    await writeFile(join(contentDir, "pages", "no-updated.md"), [
      "---",
      "title: Missing date",
      "---",
      "Body",
    ].join("\n"));

    await writeFile(join(contentDir, "pages", "no-title.md"), [
      "---",
      "updated: 2026-10-01",
      "---",
      "Body",
    ].join("\n"));

    await writeFile(join(contentDir, "pages", "unclosed.md"), ["---", "title: Unclosed", "Body"].join("\n"));

    await writeFile(join(contentDir, "secret.md"), [
      "---",
      "title: Outside pages",
      "updated: 2026-10-01",
      "---",
      "Not a page",
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

  test("returns the page frontmatter and body for a known slug", async () => {
    const res = await app!.inject({ method: "GET", url: pageUrl("now") });

    expect(res.statusCode).toBe(200);

    expect(res.json<PageData>()).toEqual({
      slug: "now",
      title: "Now",
      description: "What I am focused on at the moment.",
      updated: "2026-10-01",
      body: "Building things. ![](/content-assets/images/photo.png)",
    });
  });

  test("answers 404 for a slug with no page file", async () => {
    const res = await app!.inject({ method: "GET", url: pageUrl("missing") });

    expect(res.statusCode).toBe(404);
  });

  test("answers 404 for a page missing its required title or updated date", async () => {
    for (const slug of ["no-title", "no-updated", "unclosed"]) {
      const res = await app!.inject({ method: "GET", url: pageUrl(slug) });

      expect(res.statusCode).toBe(404);
    }
  });

  test("never resolves a slug outside content/pages/", async () => {
    for (const slug of ["..%2Fsecret", "%2E%2E%2Fsecret", "..%5Csecret", "Now"]) {
      const res = await app!.inject({ method: "GET", url: pageUrl(slug) });

      expect(res.statusCode).toBe(404);
    }
  });

  test("keeps pages out of the article and project listing", async () => {
    const res = await app!.inject({ method: "GET", url: `${API_BASE}${ROUTES.CONTENT}` });
    const slugs = res.json<{ slug: string }[]>().map((item) => item.slug);

    expect(slugs).not.toContain("now");
  });
});
