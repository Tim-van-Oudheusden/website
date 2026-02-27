import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("index.html", () => {
  test("uses Tim V.O. as the browser tab title", () => {
    const html = readFileSync(resolve(import.meta.dir, "../index.html"), "utf-8");
    expect(html).toContain("<title>Tim V.O.</title>");
    expect(html).not.toContain("<title>Website</title>");
  });
});
