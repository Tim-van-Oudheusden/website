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

  test("accepts every Conventional Commits type", () => {
    for (const type of ["build", "chore", "ci", "docs", "feat", "fix", "perf", "refactor", "revert", "style", "test"]) {
      expect(runCheck({ PR_TITLE: `${type}: keep embeds`, PR_BODY: "Fixes #1" }).status).toBe(0);
    }
  });

  test("accepts digits, dots, underscores, slashes and dashes in a scope", () => {
    expect(runCheck({ PR_TITLE: "fix(deploy/k8s_a-b.c): keep embeds", PR_BODY: "Fixes #1" }).status).toBe(0);
  });

  test.each([
    ["with a type after other text", "wip feat: add form"],
    ["with a capitalised scope", "fix(UI): add form"],
    ["without a space after the colon", "fix(ui):add form"],
    ["with an empty summary", "fix(ui): "],
  ])("fails a title %s", (_name, title) => {
    expect(runCheck({ PR_TITLE: title, PR_BODY: "Fixes #1" }).status).toBe(1);
  });

  test("fails a title that does not follow Conventional Commits", () => {
    const { status, output } = runCheck({ PR_TITLE: "Add contact form", PR_BODY: "Fixes #123" });

    expect(status).toBe(1);
    expect(output).toContain("Conventional Commits");
  });

  test("fails an unknown Conventional Commits type", () => {
    expect(runCheck({ PR_TITLE: "feature: add form", PR_BODY: "Fixes #1" }).status).toBe(1);
  });

  test("accepts a keyword ending in a colon and GitHub's owner/repo#N long form", () => {
    for (const body of ["Closes: #10", "Fixes Tim-van-Oudheusden/website#12", "(Fixes #12)"]) {
      expect(runCheck({ PR_TITLE: "fix(content): keep embeds", PR_BODY: body }).status).toBe(0);
    }
  });

  test("accepts every keyword form, in any case, however many spaces follow it", () => {
    for (const keyword of ["fix", "fixes", "fixed", "close", "closes", "closed", "resolve", "resolves", "resolved", "ref", "refs"]) {
      expect(runCheck({ PR_TITLE: "fix(content): keep embeds", PR_BODY: `${keyword} #12` }).status).toBe(0);
    }

    for (const body of ["FIXES #12", "Fixes  #12", "Fixes a/my-repo_x.y#12"]) {
      expect(runCheck({ PR_TITLE: "fix(content): keep embeds", PR_BODY: body }).status).toBe(0);
    }
  });

  test("fails a keyword with no space before the number", () => {
    expect(runCheck({ PR_TITLE: "fix(content): keep embeds", PR_BODY: "Fixes#12" }).status).toBe(1);
  });

  test("fails a body whose keyword is only part of another word", () => {
    for (const body of [
      "Follow-up to the hotfix #3; no issue yet.",
      "Uses the new prefix #1 format",
      "See prefs #2",
      "x_fixes #12",
      "2fixes #12",
    ]) {
      expect(runCheck({ PR_TITLE: "fix(content): keep embeds", PR_BODY: body }).status).toBe(1);
    }
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

  test("does not exempt an author whose login merely contains 'bot'", () => {
    const { status } = runCheck({
      PR_TITLE: "fix(content): keep embeds",
      PR_BODY: "Small cleanup.",
      PR_AUTHOR: "robotics-fan",
    });

    expect(status).toBe(1);
  });

  test("reports each failure as a GitHub error annotation", () => {
    const { output } = runCheck({ PR_TITLE: "wip", PR_BODY: "" });

    expect(output.match(/^::error::/gm)).toHaveLength(2);
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
