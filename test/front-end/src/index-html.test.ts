import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("index.html", () => {
  test("defines a non-empty browser tab title", () => {
    const html = readFileSync(resolve(import.meta.dir, "../../../front-end/index.html"), "utf-8");
    const titleMatch = /<title>([^<]+)<\/title>/.exec(html);

    expect(titleMatch).not.toBeNull();
    expect((titleMatch as string[])[1].trim().length).toBeGreaterThan(0);
  });
});
