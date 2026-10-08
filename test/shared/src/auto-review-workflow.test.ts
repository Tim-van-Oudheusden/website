import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workflowPath = resolve(import.meta.dirname, "../../../.github/workflows/auto-review.yml");

interface Step {
  name: string;
  uses?: string;
  run?: string;
  env?: Record<string, string>;
  with?: Record<string, unknown>;
}

interface ApplyJob {
  env?: Record<string, string>;
  steps: Step[];
}

function readApplyJob(): ApplyJob {
  // The workflow file is repo-controlled; a missing job or step fails the test that reads it.
  const workflow = Bun.YAML.parse(readFileSync(workflowPath, "utf8")) as { jobs: { apply: ApplyJob } };

  return workflow.jobs.apply;
}

const REPO = "owner/website";
const HEAD = { ref: "feat/1-thing", sha: "a".repeat(40) };

// Stands in for the gh CLI: answers the two REST calls the step makes and,
// like gh, filters the response through `--jq` when one is given.
const FAKE_GH = `#!/usr/bin/env bash
set -euo pipefail
endpoint="$2"; shift 2
case "$endpoint" in
  repos/*/pulls/*) response="$(cat "$FAKE_DIR/pull.json")" ;;
  repos/*/commits/*) response="$(cat "$FAKE_DIR/commit.json")" ;;
  *) echo "unexpected gh api $endpoint" >&2; exit 1 ;;
esac
if [ "\${1:-}" = "--jq" ]; then jq -r "$2" <<< "$response"; else echo "$response"; fi
`;

interface StepRun {
  status: number | null;
  output: string;
  stepOutputs: string;
}

describe(".github/workflows/auto-review.yml", () => {
  test("applies suggestions on a maintainer's /apply-suggestions PR comment, never via inline event text", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("issue_comment:");
    expect(workflow).toContain("/apply-suggestions");
    expect(workflow).toMatch(/OWNER.*MEMBER.*COLLABORATOR/);
    expect(workflow).toContain("scripts/apply-review-suggestions.sh");
    expect(workflow).not.toMatch(/\$\{\{\s*github\.event\.(comment|issue)\.(body|title)/);
  });

  test("hands GITHUB_TOKEN only to the steps that call GitHub, never to code running in the PR checkout", () => {
    const apply = readApplyJob();

    expect(apply.env ?? {}).not.toHaveProperty("GH_TOKEN");

    expect(apply.steps.filter((step) => step.env?.["GH_TOKEN"] !== undefined).map((step) => step.name)).toEqual([
      "Acknowledge command",
      "Resolve pull request head",
      "Fetch review comments",
      "Commit and push",
      "Report on the pull request",
    ]);

    for (const checkout of apply.steps.filter((step) => step.uses?.startsWith("actions/checkout@"))) {
      expect(checkout.with?.["persist-credentials"]).toBe(false);
    }
  });

  describe("Resolve pull request head", () => {
    let workDir: string;

    function runResolveHead(commentedAt: string, headCommittedAt: string): StepRun {
      const script = readApplyJob().steps.find((step) => step.name === "Resolve pull request head")?.run;

      if (script === undefined) {
        throw new Error("auto-review.yml has no 'Resolve pull request head' run step");
      }

      writeFileSync(join(workDir, "gh"), FAKE_GH);
      chmodSync(join(workDir, "gh"), 0o755);
      writeFileSync(join(workDir, "pull.json"), JSON.stringify({ head: { ...HEAD, repo: { full_name: REPO } } }));
      writeFileSync(join(workDir, "commit.json"), JSON.stringify({ sha: HEAD.sha, commit: { committer: { date: headCommittedAt } } }));
      writeFileSync(join(workDir, "github-output"), "");

      const result = spawnSync("bash", ["-c", script], {
        cwd: workDir,
        encoding: "utf8",
        env: {
          PATH: `${workDir}:${process.env["PATH"] ?? ""}`,
          FAKE_DIR: workDir,
          GITHUB_OUTPUT: join(workDir, "github-output"),
          REPO,
          PR_NUMBER: "7",
          COMMENT_AT: commentedAt,
        },
      });

      return {
        status: result.status,
        output: `${result.stdout}${result.stderr}`,
        stepOutputs: readFileSync(join(workDir, "github-output"), "utf8"),
      };
    }

    beforeEach(() => {
      workDir = mkdtempSync(join(tmpdir(), "auto-review-"));
    });

    afterEach(() => {
      rmSync(workDir, { recursive: true, force: true });
    });

    test("refuses a head committed after the /apply-suggestions comment", () => {
      const { status, output, stepOutputs } = runResolveHead("2026-10-08T12:00:00Z", "2026-10-08T12:00:01Z");

      expect(status).not.toBe(0);
      expect(output).toContain("::error::");
      expect(stepOutputs).toBe("");
    });

    test("resolves the head ref and sha when the head was committed before the comment", () => {
      const { status, stepOutputs } = runResolveHead("2026-10-08T12:00:00Z", "2026-10-08T11:59:59Z");

      expect(status).toBe(0);
      expect(stepOutputs).toBe(`ref=${HEAD.ref}\nsha=${HEAD.sha}\n`);
    });

    test("refuses when the head commit date cannot be read", () => {
      const { status, stepOutputs } = runResolveHead("2026-10-08T12:00:00Z", "not a date");

      expect(status).not.toBe(0);
      expect(stepOutputs).toBe("");
    });
  });
});
