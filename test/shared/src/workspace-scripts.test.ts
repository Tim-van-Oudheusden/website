import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

interface RootPackageJson {
  scripts?: {
    "typecheck:root"?: string;
    typecheck?: string;
  };
}

function readRootPackageJson(): RootPackageJson {
  const packageJsonPath = resolve(import.meta.dirname, "../../..", "package.json");
  const packageJsonText = readFileSync(packageJsonPath, "utf8");
  return JSON.parse(packageJsonText) as RootPackageJson;
}

function readRootFile(relativePath: string): string {
  const filePath = resolve(import.meta.dirname, "../../..", relativePath);
  return readFileSync(filePath, "utf8");
}

function rootPath(): string {
  return resolve(import.meta.dirname, "../../..");
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

  test("root typecheck passes from a clean checkout (shared is built on demand)", () => {
    // Simulate a fresh clone: shared's build artifacts do not exist yet.
    rmSync(resolve(rootPath(), "shared/dist"), { recursive: true, force: true });
    rmSync(resolve(rootPath(), "shared/tsconfig.tsbuildinfo"), { force: true });

    const result = spawnSync("bun", ["run", "typecheck"], {
      cwd: rootPath(),
      encoding: "utf8",
    });

    expect(
      result.status,
      `root typecheck failed from a clean checkout:\n${(result.stdout + result.stderr).slice(-3000)}`,
    ).toBe(0);
  }, 180_000);

  test("eslint ignores generated pi sandbox state", () => {
    const eslintConfig = readRootFile("eslint.config.js");

    expect(eslintConfig).toContain("**/.pi-sandbox/**");
  });

  // eslint's first run builds type-aware project info, which exceeds bun's
  // 5s default test timeout on a cold checkout (CI runners); the typecheck
  // test above needs orders more, so budget generously.
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
  }, 30_000);
});
