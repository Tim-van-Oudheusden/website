import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface RootPackageJson {
  scripts?: {
    "typecheck:root"?: string;
    typecheck?: string;
  };
}

function readRootPackageJson(): RootPackageJson {
  const packageJsonPath = resolve(import.meta.dirname, "../..", "package.json");
  const packageJsonText = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(packageJsonText) as RootPackageJson;
}

function readRootFile(relativePath: string): string {
  const filePath = resolve(import.meta.dirname, "../..", relativePath);
  return readFileSync(filePath, "utf8");
}

function rootPath(): string {
  return resolve(import.meta.dirname, "../..");
}

function editorAliasPath(relativePath: string): string {
  return resolve(rootPath().replace(/^\/var\/home\//, "/home/"), relativePath);
}

describe("workspace scripts", () => {
  test("root typecheck script includes a non-vacuous root TypeScript build check", () => {
    const packageJson = readRootPackageJson();
    const typecheckScript = packageJson.scripts?.typecheck;
    const rootTypecheckScript = packageJson.scripts?.["typecheck:root"];

    expect(rootTypecheckScript).toContain("tsc -p tsconfig.eslint.json --noEmit");
    expect(typecheckScript).toContain("bun run typecheck:root");
  });

  test("eslint ignores generated pi sandbox state", () => {
    const eslintConfig = readRootFile("eslint.config.js");

    expect(eslintConfig).toContain("**/.pi-sandbox/**");
  });

  test("eslint can lint backend files from the editor workspace path alias", () => {
    const result = spawnSync(
      "bun",
      ["run", "eslint", editorAliasPath("back-end/src/app.ts")],
      {
        cwd: rootPath(),
        encoding: "utf8",
      },
    );

    expect(result.stderr).not.toContain("The file was not found in any of the provided project");
    expect(result.status).toBe(0);
  });
});
