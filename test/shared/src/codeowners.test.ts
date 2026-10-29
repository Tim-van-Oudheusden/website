import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const codeownersPath = resolve(rootPath, ".github/CODEOWNERS");

function run(command: string, args: string[], input?: string): string {
  const result = spawnSync(command, args, { cwd: rootPath, encoding: "utf8", input });

  expect(result.status).toBe(0);

  return result.stdout;
}

describe(".github/CODEOWNERS", () => {
  let workDir: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "codeowners-"));
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  // CODEOWNERS patterns follow .gitignore syntax, so git itself can say which
  // tracked files each pattern owns.
  function ownedFiles(): string[] {
    const patterns = readFileSync(codeownersPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => line.split(/\s+/)[0]);
    const patternFile = join(workDir, "patterns");

    writeFileSync(patternFile, `${patterns.join("\n")}\n`);

    return run("git", ["ls-files", "-z", "--cached", "--ignored", `--exclude-from=${patternFile}`]).split("\0").filter(Boolean).sort();
  }

  function highRiskFiles(): string[] {
    const tracked = run("git", ["ls-files", "-z"]);

    return run("bash", ["scripts/tier-classify.sh", "-z"], tracked)
      .split("\n")
      .flatMap((line) => /^high\s+(.+)$/.exec(line)?.[1] ?? [])
      .sort();
  }

  test("owns exactly the tracked files the risk tiers rate high", () => {
    expect(ownedFiles()).toEqual(highRiskFiles());
  });

  test("assigns every pattern to an owner", () => {
    const rules = readFileSync(codeownersPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"));

    for (const rule of rules) {
      expect(rule).toMatch(/^\S+(\s+@[\w-]+(\/[\w-]+)?)+$/);
    }
  });
});
