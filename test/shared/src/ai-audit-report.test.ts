import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/ai-audit-report.ts");

const SINCE = "2026-10-01";

/** One PR as `gh pr list --json number,title,author,headRefName,mergedAt,mergedBy,body` prints it. */
interface PullRequest {
  number: number;
  title: string;
  author: { login: string };
  headRefName: string;
  mergedAt: string;
  mergedBy: { login: string } | null;
  body: string;
}

let workDir: string;

function pr(overrides: Partial<PullRequest> & Pick<PullRequest, "number">): PullRequest {
  return {
    title: `PR ${overrides.number}`,
    author: { login: "Tim-van-Oudheusden" },
    headRefName: `fix/${overrides.number}-change`,
    mergedAt: "2026-10-10T12:00:00Z",
    mergedBy: { login: "Tim-van-Oudheusden" },
    body: "Fixes #1",
    ...overrides,
  };
}

function runReport(prs: PullRequest[]): { status: number | null; stdout: string } {
  const prsPath = join(workDir, "prs.json");

  writeFileSync(prsPath, JSON.stringify(prs));

  const result = spawnSync(process.execPath, [scriptPath, SINCE, prsPath], { cwd: rootPath, encoding: "utf8" });

  return { status: result.status, stdout: result.stdout };
}

/** The table rows (header and divider dropped) under the `## <heading>` section. */
function sectionRows(stdout: string, heading: string): string[] {
  const lines = stdout.split("\n");
  const start = lines.indexOf(`## ${heading}`);

  if (start === -1) {
    return [];
  }

  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const section = lines.slice(start, end === -1 ? undefined : end);

  return section.filter((line) => line.startsWith("|")).slice(2);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "ai-audit-report-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/ai-audit-report.ts", () => {
  test("attributes each merged PR to its source, agent and model, oldest merge first", () => {
    const { status, stdout } = runReport([
      pr({
        number: 4,
        mergedAt: "2026-10-04T09:30:00Z",
        author: { login: "app/hive-forge-app" },
        headRefName: "quality/test-gap",
        body: "Adds a test.\n\n— hive: agent=quality backend=claude model=claude-opus-5-5 effort=high\n",
      }),
      pr({
        number: 2,
        mergedAt: "2026-10-02T08:00:00Z",
        headRefName: "claude/issue-1-fix",
        mergedBy: { login: "app/github-actions" },
      }),
      pr({
        number: 3,
        mergedAt: "2026-10-03T07:15:00Z",
        author: { login: "app/dependabot" },
        headRefName: "dependabot/bun/minor-and-patch-abc",
        body: "Bumps the minor-and-patch group.",
      }),
      pr({
        number: 5,
        mergedAt: "2026-10-05T10:00:00Z",
        body: "Fixes #1\n\n— hive: backend=omp model=anthropic/claude-opus-5-5 effort=high",
      }),
      pr({ number: 6, mergedAt: "2026-10-06T11:00:00Z", headRefName: "docs/6-readme" }),
    ]);

    expect(status).toBe(0);

    expect(sectionRows(stdout, "Ledger")).toEqual([
      "| #2 | 2026-10-02 08:00 | Claude Code (CI) | — | — | Tim-van-Oudheusden | app/github-actions | `claude/issue-1-fix` | PR 2 |",
      "| #3 | 2026-10-03 07:15 | Dependabot | — | — | app/dependabot | Tim-van-Oudheusden | `dependabot/bun/minor-and-patch-abc` | PR 3 |",
      "| #4 | 2026-10-04 09:30 | Hive | quality | claude-opus-5-5 | app/hive-forge-app | Tim-van-Oudheusden | `quality/test-gap` | PR 4 |",
      "| #5 | 2026-10-05 10:00 | Hive | — | anthropic/claude-opus-5-5 | Tim-van-Oudheusden | Tim-van-Oudheusden | `fix/5-change` | PR 5 |",
      "| #6 | 2026-10-06 11:00 | Other | — | — | Tim-van-Oudheusden | Tim-van-Oudheusden | `docs/6-readme` | PR 6 |",
    ]);
  });

  test("a Hive signature outranks the head branch", () => {
    const { stdout } = runReport([
      pr({ number: 7, headRefName: "claude/issue-7", body: "— hive: agent=scanner model=claude-sonnet-5" }),
    ]);

    expect(sectionRows(stdout, "Ledger")[0]).toStartWith("| #7 | 2026-10-10 12:00 | Hive | scanner | claude-sonnet-5 |");
  });

  test("counts merges per source and per merging account, leaving out merges before the window", () => {
    const { stdout } = runReport([
      pr({ number: 1, mergedAt: "2026-09-30T23:59:59Z", body: "— hive: agent=scanner" }),
      pr({ number: 2, mergedAt: "2026-10-01T00:00:00Z", body: "— hive: agent=scanner" }),
      pr({ number: 3, body: "— hive: agent=quality", mergedBy: { login: "app/github-actions" } }),
      pr({ number: 4, headRefName: "dependabot/bun/x", mergedBy: null }),
      pr({ number: 5, mergedBy: { login: "app/github-actions" } }),
      pr({ number: 6, mergedBy: { login: "app/github-actions" } }),
    ]);

    expect(sectionRows(stdout, "By source")).toEqual([
      "| Hive | 2 |",
      "| Claude Code (CI) | 0 |",
      "| Dependabot | 1 |",
      "| Other | 2 |",
      "| **All** | 5 |",
    ]);

    expect(sectionRows(stdout, "Merged by")).toEqual([
      "| app/github-actions | 3 |",
      "| Tim-van-Oudheusden | 1 |",
      "| Unknown (no merger recorded) | 1 |",
    ]);

    expect(sectionRows(stdout, "Ledger").map((row) => row.split(" | ")[0])).toEqual(["| #2", "| #3", "| #4", "| #5", "| #6"]);
  });

  test("escapes pipes so a title cannot add table columns", () => {
    const { stdout } = runReport([pr({ number: 8, title: "fix(a|b): keep | out" })]);

    expect(sectionRows(stdout, "Ledger")[0]).toEndWith("| fix(a\\|b): keep \\| out |");
  });

  test("fails naming the input it cannot read", () => {
    const missing = join(workDir, "missing.json");
    const result = spawnSync(process.execPath, [scriptPath, SINCE, missing], { cwd: rootPath, encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(missing);
    expect(result.stdout).toBe("");
  });
});
