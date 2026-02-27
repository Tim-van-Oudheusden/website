import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("index.html", () => {
  test("defines a non-empty browser tab title", () => {
    const html = readFileSync(resolve(import.meta.dir, "../index.html"), "utf-8");
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);

    expect(titleMatch).not.toBeNull();
    expect((titleMatch as RegExpMatchArray)[1].trim().length).toBeGreaterThan(0);
  });
});
