import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/tier-classify.sh");
const workflowPath = resolve(rootPath, ".github/workflows/tier-classifier.yml");
const docPath = resolve(rootPath, "docs/risk-tiers.md");

function classify(paths: string[], env: Record<string, string> = {}): { status: number | null; output: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    input: paths.join("\n"),
    env: { PATH: process.env["PATH"] ?? "", ...env },
  });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("scripts/tier-classify.sh", () => {
  test("classifies a content and docs only change as low risk", () => {
    const { status, output } = classify(["content/articles/hello.md", "docs/testing.md"]);

    expect(status).toBe(0);
    expect(output).toContain("tier=low");
  });

  test("classifies application source changes as medium risk", () => {
    for (const path of ["front-end/src/app.tsx", "back-end/src/routes.ts", "shared/src/articles.ts"]) {
      expect(classify(["docs/testing.md", path]).output).toContain("tier=medium");
    }
  });

  test("classifies CI, deploy, dependency and agent-governance changes as high risk", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "deploy/kube/dev.yaml",
      "front-end/Dockerfile",
      "bun.lock",
      "back-end/package.json",
      "scripts/e2e.sh",
      "AGENTS.md",
      ".claude/skills/github-issue-flow/SKILL.md",
      "prompts/code-review.md",
    ]) {
      expect(classify(["front-end/src/app.tsx", path]).output).toContain("tier=high");
    }
  });

  test("classifies research notes, static assets and top-level prose as low risk", () => {
    const { output } = classify(["research/font_recommendations.md", "public/favicon.svg", "README.md"]);

    expect(output).toContain("tier=low");
  });

  test("treats unrecognised paths, including tests, as medium risk", () => {
    expect(classify(["test/shared/src/routes.test.ts"]).output).toContain("tier=medium");
    expect(classify(["somewhere/new.txt"]).output).toContain("tier=medium");
  });

  test("lists each changed file with its own tier", () => {
    const { output } = classify(["docs/testing.md", "bun.lock"]);

    expect(output).toMatch(/high\s+bun\.lock/);
    expect(output).toMatch(/low\s+docs\/testing\.md/);
  });

  test("reports low risk for an empty change set", () => {
    const { status, output } = classify([]);

    expect(status).toBe(0);
    expect(output).toContain("tier=low");
  });
});

describe("scripts/tier-classify.sh with a custom policy", () => {
  let workDir: string;
  let policyPath: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "tier-policy-"));
    policyPath = join(workDir, "risk-tiers.policy");
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function classifyWith(policy: string, paths: string[]) {
    writeFileSync(policyPath, policy);

    return classify(paths, { RISK_TIER_POLICY: policyPath });
  }

  test("applies the first matching rule, ignoring comments and blank lines", () => {
    const policy = ["# secrets first", "high  vault/keys.md", "", "low   vault/*", "low   *.md"].join("\n");

    const { status, output } = classifyWith(policy, ["vault/keys.md", "vault/readme.txt", "notes.md", "src/app.ts"]);

    expect(status).toBe(0);
    expect(output).toMatch(/high\s+vault\/keys\.md/);
    expect(output).toMatch(/low\s+vault\/readme\.txt/);
    expect(output).toMatch(/low\s+notes\.md/);
    expect(output).toMatch(/medium\s+src\/app\.ts/);
    expect(output).toContain("tier=high");
  });

  test("rejects a rule with an unknown tier instead of classifying", () => {
    const { status, output } = classifyWith("critical  deploy/*\n", ["deploy/kube/prod.yaml"]);

    expect(status).not.toBe(0);
    expect(output).toContain("critical");
    expect(output).not.toContain("tier=");
  });

  test("fails when the policy file is missing", () => {
    const { status, output } = classify(["docs/testing.md"], { RISK_TIER_POLICY: join(workDir, "absent.policy") });

    expect(status).not.toBe(0);
    expect(output).not.toContain("tier=");
  });
});

describe(".github/workflows/tier-classifier.yml", () => {
  test("classifies pull requests with the script, passing PR fields via env rather than inline", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("scripts/tier-classify.sh");
    expect(workflow).not.toMatch(/run:[^\n]*\$\{\{\s*github\.event\.pull_request/);
  });
});

describe("docs/risk-tiers.md", () => {
  test("documents every tier the classifier can report", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const tier of ["low", "medium", "high"]) {
      expect(doc).toMatch(new RegExp(`^#+ .*\\b${tier}\\b`, "im"));
    }
  });
});
