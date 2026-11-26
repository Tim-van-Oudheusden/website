import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../../../../front-end/src/index.css");

/** Top-level `@media (prefers-reduced-motion: reduce)` blocks, i.e. those outside any `@layer`. */
function unlayeredReducedMotionBlocks(css: string): string[] {
  const blocks: string[] = [];
  let depth = 0;

  for (let index = 0; index < css.length; index += 1) {
    const char = css[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
    } else if (depth === 0 && css.startsWith("@media (prefers-reduced-motion: reduce)", index)) {
      const open = css.indexOf("{", index);
      let inner = 1;
      let end = open + 1;

      while (inner > 0 && end < css.length) {
        if (css[end] === "{") {
          inner += 1;
        } else if (css[end] === "}") {
          inner -= 1;
        }

        end += 1;
      }

      blocks.push(css.slice(open + 1, end - 1));
      index = end - 1;
    }
  }

  return blocks;
}

describe("reduced motion for tw-animate-css overlays", () => {
  test("the sheet and dropdown fade without moving when reduced motion is preferred", () => {
    const blocks = unlayeredReducedMotionBlocks(readFileSync(INDEX_CSS_PATH, "utf8"));
    const block = blocks.find((candidate) => candidate.includes('[data-slot="sheet-content"]'));

    if (!block) {
      throw new Error("Expected an unlayered reduced-motion block for the sheet content");
    }

    expect(block).toContain('[data-slot="dropdown-menu-content"]');

    for (const declaration of [
      "--tw-enter-translate-x: 0;",
      "--tw-exit-translate-x: 0;",
      "--tw-enter-translate-y: 0;",
      "--tw-exit-translate-y: 0;",
      "--tw-enter-scale: 1;",
      "--tw-exit-scale: 1;",
      "--tw-enter-opacity: 0;",
      "--tw-exit-opacity: 0;",
    ]) {
      expect(block).toContain(declaration);
    }
  });
});
