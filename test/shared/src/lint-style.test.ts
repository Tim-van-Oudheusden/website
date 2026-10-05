import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface EslintFileResult {
  output?: string;
}

const rootPath = resolve(import.meta.dirname, "../../..");

/**
 * Runs the repo ESLint config with autofix on `source` and returns the fixed text.
 * The source is written to a real file inside the shared ESLint project: type-aware
 * parsing reads in-project files from disk, so `--stdin` would lint the on-disk copy.
 */
function eslintFix(source: string): string {
  const fixturePath = resolve(import.meta.dirname, `lint-style-fixture-${String(process.pid)}.ts`);

  writeFileSync(fixturePath, source);

  try {
    const result = spawnSync(
      "bun",
      ["run", "eslint", "--fix-dry-run", "--format", "json", fixturePath],
      { cwd: rootPath, encoding: "utf8" },
    );
    const [fileResult] = JSON.parse(result.stdout) as EslintFileResult[];

    return fileResult?.output ?? source;
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

describe("lint house style", () => {
  // Type-aware ESLint builds the project program on first run; budget like workspace-scripts.test.ts.
  test("autofix rewrites TypeScript into the house formatting", () => {
    const messy = [
      "export const greeting = 'hello'",
      "export function check(items: string[], limit: number): number {",
      "  const count = items.length",
      "  const ok = count > 0 &&",
      "    limit > 0",
      "  if (ok) return limit",
      "  for (const item of items) { console.warn(item) }",
      "  return count",
      "}",
      "export const config = {",
      "  'name': greeting,",
      "  limit: 3",
      "}",
      "",
    ].join("\n");

    const formatted = [
      "export const greeting = \"hello\";",
      "",
      "export function check(items: string[], limit: number): number {",
      "  const count = items.length;",
      "  const ok = count > 0",
      "    && limit > 0;",
      "",
      "  if (ok) {",
      "    return limit;",
      "  }",
      "",
      "  for (const item of items) {",
      "    console.warn(item);",
      "  }",
      "",
      "  return count;",
      "}",
      "",
      "export const config = {",
      "  name: greeting,",
      "  limit: 3,",
      "};",
      "",
    ].join("\n");

    expect(eslintFix(messy)).toBe(formatted);
  }, 30_000);
});
