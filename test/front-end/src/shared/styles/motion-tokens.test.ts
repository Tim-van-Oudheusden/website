import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const FRONT_END_SRC = resolve(import.meta.dir, "../../../../../front-end/src");
const INDEX_CSS_PATH = join(FRONT_END_SRC, "index.css");

function themeInlineBlock(css: string): string {
  const match = /@theme inline\s*{([^}]*)}/.exec(css);

  if (!match) {
    throw new Error("Expected an @theme inline block in index.css");
  }

  return match[1]!;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return sourceFiles(path);
    }

    return /\.(tsx?|css)$/.test(entry.name) ? [path] : [];
  });
}

describe("motion tokens", () => {
  test("redefines ease-out and ease-in-out and adds a drawer curve in the theme", () => {
    const theme = themeInlineBlock(readFileSync(INDEX_CSS_PATH, "utf8"));

    expect(theme).toContain("--ease-out: cubic-bezier(0.23, 1, 0.32, 1);");
    expect(theme).toContain("--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);");
    expect(theme).toContain("--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);");
  });

  test("no front-end source transitions every property", () => {
    const offenders = sourceFiles(FRONT_END_SRC).filter((file) => readFileSync(file, "utf8").includes("transition-all"));

    expect(offenders).toEqual([]);
  });
});
