import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/strategy-report.ts");

const SINCE = "2026-10-01";

/** One issue as `gh issue list --json number,title,state,labels,createdAt,closedAt` prints it. */
interface Issue {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: { name: string }[];
  createdAt: string;
  closedAt: string | null;
}

let workDir: string;

function issue(overrides: Partial<Issue> & Pick<Issue, "number">): Issue {
  return {
    title: `Issue ${overrides.number}`,
    state: "OPEN",
    labels: [],
    createdAt: "2026-09-01T12:00:00Z",
    closedAt: null,
    ...overrides,
  };
}

function writeJson(name: string, value: unknown): string {
  const path = join(workDir, name);

  writeFileSync(path, JSON.stringify(value));

  return path;
}

function runReport(issues: Issue[], mergedAt: string[] = []): { status: number | null; stdout: string } {
  const issuesPath = writeJson("issues.json", issues);
  const prsPath = writeJson("prs.json", mergedAt.map((at) => ({ mergedAt: at })));
  const result = spawnSync(process.execPath, [scriptPath, SINCE, issuesPath, prsPath], { cwd: rootPath, encoding: "utf8" });

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
  workDir = mkdtempSync(join(tmpdir(), "strategy-report-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/strategy-report.ts", () => {
  test("counts issues opened and closed, and PRs merged, from the start of the window on", () => {
    const { status, stdout } = runReport(
      [
        issue({ number: 1, createdAt: "2026-09-30T23:59:59Z" }),
        issue({ number: 2, createdAt: "2026-10-01T00:00:00Z" }),
        issue({ number: 3, createdAt: "2026-10-12T08:00:00Z", state: "CLOSED", closedAt: "2026-10-13T08:00:00Z" }),
        issue({ number: 4, state: "CLOSED", closedAt: "2026-09-30T10:00:00Z" }),
        issue({ number: 5, state: "CLOSED", closedAt: "2026-10-02T10:00:00Z" }),
        issue({ number: 6, createdAt: "2026-10-20T08:00:00Z" }),
      ],
      ["2026-09-29T10:00:00Z", "2026-10-01T00:00:00Z", "2026-10-15T10:00:00Z"],
    );

    expect(status).toBe(0);

    expect(sectionRows(stdout, "Flow")).toEqual([
      "| Issues opened | 3 |",
      "| Issues closed | 2 |",
      "| Net backlog change | +1 |",
      "| PRs merged | 2 |",
      "| Open issues now | 3 |",
    ]);
  });

  test("counts open issues per pipeline stage, in stage order, with unstaged ones last", () => {
    const { stdout } = runReport([
      issue({ number: 1, labels: [{ name: "bug" }, { name: "stage/045-needs-decision" }] }),
      issue({ number: 2, labels: [{ name: "stage/010-actionable" }] }),
      issue({ number: 3, labels: [{ name: "stage/045-needs-decision" }] }),
      issue({ number: 4, labels: [{ name: "enhancement" }] }),
      issue({ number: 5, state: "CLOSED", closedAt: "2026-10-02T10:00:00Z", labels: [{ name: "stage/100-merge-queue" }] }),
    ]);

    expect(sectionRows(stdout, "Backlog by stage")).toEqual([
      "| stage/010-actionable | 1 |",
      "| stage/045-needs-decision | 2 |",
      "| No stage | 1 |",
    ]);
  });

  test("tallies ACMM gap issues per level, naming the ones still open", () => {
    const acmm = [{ name: "acmm" }];
    const { stdout } = runReport([
      issue({ number: 10, title: "[ACMM L6] Add Strategic dashboard", labels: acmm }),
      issue({ number: 11, title: "[ACMM L6] Add Merge queue", labels: acmm, state: "CLOSED", closedAt: "2026-10-29T19:00:00Z" }),
      issue({ number: 12, title: "[ACMM L4] Add Nightly compliance", labels: acmm, state: "CLOSED", closedAt: "2026-09-03T21:00:00Z" }),
      issue({ number: 13, title: "[ACMM L6] Add Auto issue generation", labels: acmm }),
      issue({ number: 14, title: "[ACMM L6] Not filed by the evaluation" }),
    ]);

    expect(sectionRows(stdout, "ACMM progress")).toEqual([
      "| L4 | 1 | 0 | — |",
      "| L6 | 1 | 2 | #10 Strategic dashboard, #13 Auto issue generation |",
    ]);
  });

  test("fails naming the input it cannot read", () => {
    const missing = join(workDir, "missing.json");
    const prsPath = writeJson("prs.json", []);
    const result = spawnSync(process.execPath, [scriptPath, SINCE, missing, prsPath], { cwd: rootPath, encoding: "utf8" });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(missing);
    expect(result.stdout).toBe("");
  });
});
