import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";

import { API_BASE, ROUTES } from "shared";

import { buildApp } from "../../../../../back-end/src/app";
import { createViewStore } from "../../../../../back-end/src/features/views/view-store";

const ARTICLE_MARKDOWN = [
  "---",
  "title: Hello World",
  "publishDate: 2026-01-02",
  "type: article",
  "category: Introduction",
  "---",
  "# Hello World",
].join("\n");

function viewUrl(slug: string): string {
  return `${API_BASE}${ROUTES.VIEW_BY_SLUG.replace(":slug", slug)}`;
}

describe("view store", () => {
  test("aggregates counts per slug and day", () => {
    const store = createViewStore(":memory:");

    store.record("a", "2026-01-01");
    store.record("a", "2026-01-01");
    store.record("a", "2026-01-02");
    store.record("b", "2026-01-01");

    expect(store.list()).toEqual([
      { slug: "a", date: "2026-01-01", count: 2 },
      { slug: "a", date: "2026-01-02", count: 1 },
      { slug: "b", date: "2026-01-01", count: 1 },
    ]);

    store.close();
  });

  test("counts survive reopening the same database file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-views-"));
    const path = join(dir, "views.sqlite");

    try {
      const first = createViewStore(path);

      first.record("a", "2026-01-01");
      first.close();

      const second = createViewStore(path);

      expect(second.list()).toEqual([{ slug: "a", date: "2026-01-01", count: 1 }]);
      second.close();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("view routes", () => {
  let app: FastifyInstance | null = null;
  let contentDir: string;

  beforeAll(async () => {
    contentDir = await mkdtemp(join(tmpdir(), "website-views-content-"));
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

  test("POST records a view for an existing slug and /views reports it to loopback", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const post = await app.inject({ method: "POST", url: viewUrl("hello-world") });

    expect(post.statusCode).toBe(204);

    const stats = await app.inject({ method: "GET", url: "/views", remoteAddress: "127.0.0.1" });
    const rows = stats.json<{ slug: string; date: string; count: number }[]>();

    expect(stats.statusCode).toBe(200);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("hello-world");
    expect(rows[0]?.count).toBe(1);
    expect(rows[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("POST for an unknown slug is a 404 and records nothing", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const post = await app.inject({ method: "POST", url: viewUrl("does-not-exist") });

    expect(post.statusCode).toBe(404);

    const stats = await app.inject({ method: "GET", url: "/views", remoteAddress: "127.0.0.1" });

    expect(stats.json<{ slug: string }[]>().some((row) => row.slug === "does-not-exist")).toBe(false);
  });

  test("/views is not reachable from a non-loopback caller", async () => {
    if (app === null) {
      throw new Error("App not initialized");
    }

    const res = await app.inject({ method: "GET", url: "/views", remoteAddress: "203.0.113.9" });

    expect(res.statusCode).toBe(404);
  });
});
