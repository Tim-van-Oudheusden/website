import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workflowPath = resolve(import.meta.dirname, "../../../.github/workflows/auto-review.yml");

interface Workflow {
  jobs: Record<string, { steps: { name?: string; run?: string }[] }>;
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

let workDir: string;

function resolveHeadStep(): string {
  const workflow = Bun.YAML.parse(readFileSync(workflowPath, "utf8")) as Workflow;
  const step = workflow.jobs["apply"]?.steps.find((candidate) => candidate.name === "Resolve pull request head");

  if (step?.run === undefined) {
    throw new Error("auto-review.yml has no 'Resolve pull request head' run step");
  }

  return step.run;
}

interface StepRun {
  status: number | null;
  output: string;
  stepOutputs: string;
}

function runResolveHead(commentedAt: string, headCommittedAt: string): StepRun {
  writeFileSync(join(workDir, "gh"), FAKE_GH);
  chmodSync(join(workDir, "gh"), 0o755);
  writeFileSync(join(workDir, "pull.json"), JSON.stringify({ head: { ...HEAD, repo: { full_name: REPO } } }));
  writeFileSync(join(workDir, "commit.json"), JSON.stringify({ sha: HEAD.sha, commit: { committer: { date: headCommittedAt } } }));
  writeFileSync(join(workDir, "github-output"), "");

  const result = spawnSync("bash", ["-c", resolveHeadStep()], {
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

describe(".github/workflows/auto-review.yml: Resolve pull request head", () => {
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
});
