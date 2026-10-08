import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("index.html", () => {
  test("defines a non-empty browser tab title", () => {
    const html = readFileSync(resolve(import.meta.dir, "../../../front-end/index.html"), "utf-8");
    const titleMatch = /<title>([^<]+)<\/title>/.exec(html);

    expect(titleMatch).not.toBeNull();
    expect((titleMatch?.[1] ?? "").trim().length).toBeGreaterThan(0);
  });

  test("declares the SVG favicon so browsers do not fall back to /favicon.ico", () => {
    const html = readFileSync(resolve(import.meta.dir, "../../../front-end/index.html"), "utf-8");
    const icons = [...html.matchAll(/<link\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => /\brel="icon"/.test(tag));

    expect(icons).toHaveLength(1);
    expect(icons[0]).toContain('type="image/svg+xml"');
    expect(icons[0]).toContain('href="/favicon.svg"');
  });

  test("advertises the Atom feed so feed readers can discover it from any page", () => {
    const html = readFileSync(resolve(import.meta.dir, "../../../front-end/index.html"), "utf-8");
    const feeds = [...html.matchAll(/<link\b[^>]*>/g)]
      .map(([tag]) => tag)
      .filter((tag) => /\brel="alternate"/.test(tag));

    expect(feeds).toHaveLength(1);
    expect(feeds[0]).toContain('type="application/atom+xml"');
    expect(feeds[0]).toContain('href="/feed.xml"');
  });
});
