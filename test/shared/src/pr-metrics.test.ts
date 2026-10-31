import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/pr-metrics.ts");

const SINCE = "2026-10-01";

/** One PR as `gh pr list --json number,headRefName,mergedAt,body` prints it. */
interface PullRequest {
  number: number;
  headRefName: string;
  mergedAt: string | null;
  body: string;
}

let workDir: string;

function pr(overrides: Partial<PullRequest> & Pick<PullRequest, "number">): PullRequest {
  return {
    headRefName: `fix/${overrides.number}-change`,
    mergedAt: "2026-10-10T12:00:00Z",
    body: "Fixes #1",
    ...overrides,
  };
}

function runMetrics(prs: PullRequest[]): { status: number | null; stdout: string } {
  const prsPath = join(workDir, "prs.json");

  writeFileSync(prsPath, JSON.stringify(prs));

  const result = spawnSync(process.execPath, [scriptPath, SINCE, prsPath], { cwd: rootPath, encoding: "utf8" });

  return { status: result.status, stdout: result.stdout };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "pr-metrics-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/pr-metrics.ts", () => {
  test("splits closed PRs by the audit trail's sources, a Hive signature ahead of the branch", () => {
    const hive = "Fixes #1\n\n— hive: agent=quality backend=claude model=claude-opus-5-5 effort=high\n";
    const { status, stdout } = runMetrics([
      pr({ number: 1, headRefName: "quality/test-gap", body: hive }),
      pr({ number: 2, headRefName: "craftsman/rename", body: hive, mergedAt: null }),
      pr({ number: 3, headRefName: "claude/issue-3", body: "— hive: backend=omp model=anthropic/claude-opus-5-5" }),
      pr({ number: 4, headRefName: "dependabot/bun/minor-and-patch-abc", mergedAt: null }),
      pr({ number: 5, headRefName: "docs/5-readme" }),
    ]);

    expect(status).toBe(0);
    expect(stdout).toContain(`PRs closed from ${SINCE} to now.`);

    expect(stdout.split("\n").filter((line) => line.startsWith("|")).slice(2)).toEqual([
      "| Hive | 3 | 2 | 1 | 66.7% |",
      "| Claude Code (CI) | 0 | 0 | 0 | n/a |",
      "| Dependabot | 1 | 0 | 1 | 0% |",
      "| Other | 1 | 1 | 0 | 100% |",
      "| **All** | 5 | 3 | 2 | 60% |",
    ]);
  });

  test("counts a claude/* branch without a Hive signature as Claude Code (CI)", () => {
    const { stdout } = runMetrics([pr({ number: 6, headRefName: "claude/issue-6-fix" })]);

    expect(stdout).toContain("\n| Claude Code (CI) | 1 | 1 | 0 | 100% |\n");
  });

  test("fails naming the input it cannot read", () => {
    const missing = join(workDir, "missing.json");
    const result = spawnSync(process.execPath, [scriptPath, SINCE, missing], { cwd: rootPath, encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(missing);
    expect(result.stdout).toBe("");
  });
});
