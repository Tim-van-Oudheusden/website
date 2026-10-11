import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");
const claudeAction = "uses: anthropics/claude-code-action@";

function readWorkflow(name: string): string {
  return readFileSync(resolve(workflowsDir, name), "utf8");
}

// Parsed from this repo's own workflow, not outside input: a wrong shape fails the assertions below.
const claudeWorkflow = Bun.YAML.parse(readWorkflow("claude.yml")) as {
  jobs: { claude: { if: string; steps: { name?: string; if?: string; run?: string }[] } };
};

describe(".github/workflows/claude.yml", () => {
  test("is the only workflow that runs Claude Code, so one mention starts one run", () => {
    const runners = readdirSync(workflowsDir).filter((name) => readWorkflow(name).includes(claudeAction));

    expect(runners).toEqual(["claude.yml"]);
  });

  test("pins the action to a commit and only answers trusted mentions", () => {
    const workflow = readWorkflow("claude.yml");
    const jobIf = claudeWorkflow.jobs.claude.if;

    expect(workflow).toMatch(/uses: anthropics\/claude-code-action@[0-9a-f]{40}\b/);
    expect(workflow).toContain("label_trigger: ai-fix-requested");
    expect(jobIf.match(/contains\(github\.event\.(comment|review)\.body, '@claude'\)/g)).toHaveLength(3);
    expect(jobIf.match(/fromJSON\('\["OWNER","MEMBER","COLLABORATOR"\]'\)/g)).toHaveLength(3);
    expect(workflow).not.toContain("pull_request_target");
  });

  // claude-code-action checks out the PR head (fork PRs via refs/pull/N/head) and
  // Claude may run bun install/test/build on it while the job holds a write token.
  test("refuses fork pull requests before anything else runs", () => {
    const [first] = claudeWorkflow.jobs.claude.steps;

    expect(first?.name).toBe("Refuse fork pull requests");
    expect(first?.if).toBe("github.event.issue.pull_request || github.event.pull_request");
    expect(first?.run).toContain('.head.repo.full_name // ""');
    expect(first?.run).toContain('[ "$head_repo" != "$REPO" ]');
  });
});
