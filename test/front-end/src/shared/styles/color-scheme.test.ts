import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../../../../front-end/src/index.css");

function topLevelBlock(css: string, selector: string): string {
  const match = new RegExp(`^${selector.replace(".", "\\.")} \\{\\n([\\s\\S]*?)^\\}`, "m").exec(css);

  if (match === null) {
    throw new Error(`Expected a top-level ${selector} block in index.css`);
  }

  return match[1]!;
}

describe("color-scheme", () => {
  test("renders native controls and scrollbars light in the light theme", () => {
    expect(topLevelBlock(readFileSync(INDEX_CSS_PATH, "utf8"), ":root")).toMatch(/^\s*color-scheme: light;$/m);
  });

  test("renders native controls and scrollbars dark in the dark theme", () => {
    expect(topLevelBlock(readFileSync(INDEX_CSS_PATH, "utf8"), ".dark")).toMatch(/^\s*color-scheme: dark;$/m);
  });
});
