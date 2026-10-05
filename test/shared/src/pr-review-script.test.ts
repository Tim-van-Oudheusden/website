import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/pr-review-check.sh");
const workflowPath = resolve(rootPath, ".github/workflows/review.yml");

function runCheck(env: Record<string, string>): { status: number | null; output: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "", PR_AUTHOR: "someone", ...env },
  });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("scripts/pr-review-check.sh", () => {
  test("passes a Conventional Commits title whose body links an issue", () => {
    const { status } = runCheck({
      PR_TITLE: "feat(home): add contact form",
      PR_BODY: "## Summary\n\nFixes #123\n",
    });

    expect(status).toBe(0);
  });

  test("accepts breaking-change titles and Closes/Resolves/Refs links", () => {
    for (const body of ["Closes #1", "resolves #22", "Refs #333"]) {
      expect(runCheck({ PR_TITLE: "refactor(api)!: drop v1 routes", PR_BODY: body }).status).toBe(0);
    }
  });

  test("fails a title that does not follow Conventional Commits", () => {
    const { status, output } = runCheck({ PR_TITLE: "Add contact form", PR_BODY: "Fixes #123" });

    expect(status).toBe(1);
    expect(output).toContain("Conventional Commits");
  });

  test("fails an unknown Conventional Commits type", () => {
    expect(runCheck({ PR_TITLE: "feature: add form", PR_BODY: "Fixes #1" }).status).toBe(1);
  });

  test("fails a body that leaves the template's issue placeholder empty", () => {
    const { status, output } = runCheck({
      PR_TITLE: "fix(deps): tighten route",
      PR_BODY: "Fixes #<!-- issue number -->",
    });

    expect(status).toBe(1);
    expect(output).toContain("issue");
  });

  test("exempts bot authors from the issue-link requirement", () => {
    const { status } = runCheck({
      PR_TITLE: "chore(deps): bump eslint from 10.9.0 to 10.9.1",
      PR_BODY: "Bumps eslint.",
      PR_AUTHOR: "dependabot[bot]",
    });

    expect(status).toBe(0);
  });

  test("reports every failed rubric item, not just the first", () => {
    const { status, output } = runCheck({ PR_TITLE: "wip", PR_BODY: "" });

    expect(status).toBe(1);
    expect(output).toContain("Conventional Commits");
    expect(output).toContain("issue");
  });
});

describe(".github/workflows/review.yml", () => {
  test("runs the rubric check on pull requests, passing PR fields via env rather than inline", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("scripts/pr-review-check.sh");
    expect(workflow).not.toMatch(/run:[^\n]*\$\{\{\s*github\.event\.pull_request/);
  });
});
