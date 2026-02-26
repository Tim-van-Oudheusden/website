import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../index.css");
const SOURCE_SANS_IMPORT = '@import url("https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap");';
const SOURCE_SANS_STACK = 'font-family: "Source Sans 3", "Source Sans Pro", "Segoe UI", "Helvetica Neue", Arial, sans-serif;';
const BEIGE_LIGHT_TOKEN = "--adw-beige-light: #f3efe5;";
const BEIGE_DARK_TOKEN = "--adw-beige-dark: #1c1a17;";
const PAGE_BG_BEIGE_MAPPING = "--adw-page-brown-bg: var(--adw-page-beige-bg);";

describe("global font recommendation", () => {
  test("imports Source Sans 3 and applies it as the default font stack", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(SOURCE_SANS_IMPORT);
    expect(css).toContain(SOURCE_SANS_STACK);
  });

  test("defines light and dark beige palette tokens", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(BEIGE_LIGHT_TOKEN);
    expect(css).toContain(BEIGE_DARK_TOKEN);
  });

  test("maps page backgrounds to beige variants in both themes", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(PAGE_BG_BEIGE_MAPPING);
  });
});
