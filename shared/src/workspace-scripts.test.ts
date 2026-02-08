import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface RootPackageJson {
  scripts?: {
    typecheck?: string;
  };
}

function readRootPackageJson(): RootPackageJson {
  const packageJsonPath = resolve(import.meta.dirname, "../..", "package.json");
  const packageJsonText = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(packageJsonText) as RootPackageJson;
}

describe("workspace scripts", () => {
  test("root typecheck script includes a non-vacuous root TypeScript build check", () => {
    const packageJson = readRootPackageJson();
    const typecheckScript = packageJson.scripts?.typecheck;

    expect(typecheckScript).toContain("tsc -b --noEmit");
  });
});
