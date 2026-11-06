import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const PRINT_FORBID_ONLY = "const { default: config } = await import(\"./playwright.config.ts\"); console.log(config.forbidOnly);";

/** What the config sets, in a process of its own: it reads `CI` when it loads. */
function forbidOnlyWith(ci: string | undefined): string {
  const { CI: _unused, ...env } = process.env;
  const result = spawnSync(process.execPath, ["-e", PRINT_FORBID_ONLY], {
    cwd: rootPath,
    encoding: "utf8",
    env: ci === undefined ? env : { ...env, CI: ci },
  });

  expect(result.status).toBe(0);

  return result.stdout.trim();
}

describe("playwright.config.ts", () => {
  test("refuses a committed test.only in CI, where it would cut the suite down to that test and still pass", () => {
    expect(forbidOnlyWith("true")).toBe("true");
  });

  test("still lets a local run focus on one test", () => {
    expect(forbidOnlyWith(undefined)).toBe("false");
  });
});
