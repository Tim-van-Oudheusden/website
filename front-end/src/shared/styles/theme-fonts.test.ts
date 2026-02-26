import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../index.css");
const SOURCE_SANS_IMPORT = '@import url("https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap");';
const SOURCE_SANS_STACK = 'font-family: "Source Sans 3", "Source Sans Pro", "Segoe UI", "Helvetica Neue", Arial, sans-serif;';

describe("global font recommendation", () => {
  test("imports Source Sans 3 and applies it as the default font stack", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(SOURCE_SANS_IMPORT);
    expect(css).toContain(SOURCE_SANS_STACK);
  });
});
