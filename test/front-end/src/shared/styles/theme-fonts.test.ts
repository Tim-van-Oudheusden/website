import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../../../../front-end/src/index.css");
const PUBLIC_DIR = resolve(import.meta.dir, "../../../../../public");
const SOURCE_SANS_STACK = 'font-family: "Source Sans 3", "Source Sans Pro", "Segoe UI", "Helvetica Neue", Arial, sans-serif;';
const BEIGE_LIGHT_TOKEN = "--adw-beige-light: #f3efe5;";
const BEIGE_DARK_TOKEN = "--adw-beige-dark: #1c1a17;";
const PAGE_BG_BEIGE_MAPPING = "--adw-page-brown-bg: var(--adw-page-beige-bg);";
const TOC_INACTIVE_LIGHT_TOKEN = "--adw-toc-inactive: #8a8376;";

describe("global font recommendation", () => {
  test("applies Source Sans 3 as the default font stack", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(SOURCE_SANS_STACK);
  });

  test("self-hosts Source Sans 3 from woff2 files that ship in public/ and loads nothing from Google", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");
    const faces = [...css.matchAll(/@font-face\s*{[^}]*}/g)].map((match) => match[0]).filter((face) => face.includes('"Source Sans 3"'));
    const sources = faces.flatMap((face) => [...face.matchAll(/url\("(\/fonts\/[^"]+\.woff2)"\)/g)].map((match) => match[1]!));

    expect(faces.length).toBeGreaterThan(0);
    expect(sources.length).toBe(faces.length);

    for (const source of sources) {
      const magic = readFileSync(join(PUBLIC_DIR, source)).subarray(0, 4).toString("latin1");

      expect(magic).toBe("wOF2");
    }

    expect(css).not.toMatch(/googleapis|gstatic/);
    expect(readFileSync(join(PUBLIC_DIR, "fonts/OFL.txt"), "utf8")).toContain("SIL Open Font License");
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

  test("defines a beige-toned inactive TOC link colour for the light theme", () => {
    const css = readFileSync(INDEX_CSS_PATH, "utf8");

    expect(css).toContain(TOC_INACTIVE_LIGHT_TOKEN);
  });
});
