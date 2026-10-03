import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/nightly-compliance.sh");

let workDir: string;
let stubDir: string;
let contentDir: string;

// Stub `bun`: `bun audit` prints an advisory and exits 1 when STUB_AUDIT_FAIL=1.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");
  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
if [ "$1" = audit ]; then
  if [ "\${STUB_AUDIT_FAIL:-0}" = 1 ]; then
    echo "high: fastify vulnerable to something - https://github.com/advisories/GHSA-xxxx"
    exit 1
  fi
  echo "No vulnerabilities found"
  exit 0
fi
exit 0
`,
  );
  chmodSync(stubPath, 0o755);
}

function runScript(env: Record<string, string> = {}): { status: number | null; report: string; log: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      CONTENT_DIR: contentDir,
      GITHUB_SHA: "abc1234",
      ...env,
    },
  });
  return { status: result.status, report: result.stdout, log: result.stderr };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "nightly-compliance-"));
  stubDir = join(workDir, "bin");
  contentDir = join(workDir, "content");
  mkdirSync(stubDir);
  mkdirSync(contentDir);
  writeFileSync(join(contentDir, "Published.md"), "---\ntitle: Published\n---\n\nHello.\n");
  writeBunStub();
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/nightly-compliance.sh", () => {
  test("passes and reports every check when dependencies are clean and no drafts are published", () => {
    const { status, report } = runScript();

    expect(status).toBe(0);
    expect(report).toContain("# Nightly compliance");
    expect(report).toContain("`abc1234`");
    expect(report).toMatch(/Dependency audit.*pass/);
    expect(report).toMatch(/Draft leak guard.*pass/);
  });

  test("fails when the dependency audit finds high-severity advisories", () => {
    const { status, report, log } = runScript({ STUB_AUDIT_FAIL: "1" });

    expect(status).toBe(1);
    expect(report).toMatch(/Dependency audit.*fail/);
    expect(log).toContain("GHSA-xxxx");
  });

  test("fails and names the file when content contains a draft", () => {
    writeFileSync(join(contentDir, "Unfinished.md"), "---\ntitle: Unfinished\ndraft: true\n---\n");

    const { status, report, log } = runScript();

    expect(status).toBe(1);
    expect(report).toMatch(/Draft leak guard.*fail/);
    expect(log).toContain("Unfinished.md");
  });

  test("runs every check even when an earlier one fails", () => {
    writeFileSync(join(contentDir, "Unfinished.md"), "---\ndraft: true\n---\n");

    const { status, report } = runScript({ STUB_AUDIT_FAIL: "1" });

    expect(status).toBe(1);
    expect(report).toMatch(/Dependency audit.*fail/);
    expect(report).toMatch(/Draft leak guard.*fail/);
  });
});

describe(".github/workflows/nightly-compliance.yml", () => {
  test("runs the compliance script nightly and on demand with read-only permissions", () => {
    const workflow = readFileSync(resolve(rootPath, ".github/workflows/nightly-compliance.yml"), "utf8");

    expect(workflow).toMatch(/schedule:\s*\n\s*- cron:/);
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toMatch(/permissions:\s*\n\s*contents: read/);
    expect(workflow).toContain("bun install --frozen-lockfile");
    expect(workflow).toContain("scripts/nightly-compliance.sh");
  });
});
