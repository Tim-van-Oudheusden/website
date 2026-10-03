import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const configPath = resolve(rootPath, ".github/labeler.yml");
const workflowPath = resolve(rootPath, ".github/workflows/labeler.yml");

interface ChangedFilesRule { "any-glob-to-any-file": string | string[] }
interface LabelRule { "changed-files": ChangedFilesRule[] }

function loadConfig(): Record<string, LabelRule[]> {
  return Bun.YAML.parse(readFileSync(configPath, "utf8")) as Record<string, LabelRule[]>;
}

// Mirrors actions/labeler's `changed-files: any-glob-to-any-file` matching with `dot: true`.
function labelsFor(path: string): string[] {
  return Object.entries(loadConfig())
    .filter(([, rules]) =>
      rules.some((rule) =>
        rule["changed-files"].some((match) =>
          [match["any-glob-to-any-file"]].flat().some((glob) => new Bun.Glob(glob).match(path)),
        ),
      ),
    )
    .map(([label]) => label)
    .sort();
}

describe(".github/labeler.yml", () => {
  test("labels workspace changes, including their tests, by workspace", () => {
    expect(labelsFor("front-end/src/App.tsx")).toEqual(["front-end"]);
    expect(labelsFor("test/front-end/src/App.test.tsx")).toEqual(["front-end"]);
    expect(labelsFor("back-end/src/server.ts")).toEqual(["back-end"]);
    expect(labelsFor("test/back-end/src/server.test.ts")).toEqual(["back-end"]);
    expect(labelsFor("shared/src/articles.ts")).toEqual(["shared"]);
    expect(labelsFor("test/shared/src/labeler-config.test.ts")).toEqual(["shared"]);
  });

  test("labels articles, e2e, CI, deploy and docs changes", () => {
    expect(labelsFor("content/Introduction.md")).toEqual(["content"]);
    expect(labelsFor("content/images/cover.png")).toEqual(["content"]);
    expect(labelsFor("e2e/top-bar-theme-toggle.e2e.ts")).toEqual(["e2e"]);
    expect(labelsFor("playwright.config.ts")).toEqual(["e2e"]);
    expect(labelsFor(".github/workflows/ci.yml")).toEqual(["ci"]);
    expect(labelsFor("scripts/coverage-check.sh")).toEqual(["ci"]);
    expect(labelsFor("deploy/kube/prod.yaml")).toEqual(["deploy"]);
    expect(labelsFor("docs/testing.md")).toEqual(["documentation"]);
    expect(labelsFor("README.md")).toEqual(["documentation"]);
  });

  test("labels manifest and lockfile changes as dependencies", () => {
    expect(labelsFor("bun.lock")).toEqual(["dependencies"]);
    expect(labelsFor("package.json")).toEqual(["dependencies"]);
    expect(labelsFor("front-end/package.json")).toEqual(["dependencies", "front-end"]);
  });
});

describe(".github/workflows/labeler.yml", () => {
  test("labels pull requests from the base config without checking out PR code", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("pull_request_target:");
    expect(workflow).toContain("uses: actions/labeler@");
    expect(workflow).toContain("pull-requests: write");
    expect(workflow).not.toContain("actions/checkout");
  });
});
