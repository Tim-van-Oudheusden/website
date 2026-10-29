import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const scriptPath = resolve(import.meta.dirname, "../../../scripts/merge-queue.sh");
const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");

const RUN_URL = "https://github.com/owner/website/actions/runs/42";

// Stands in for the gh CLI. `gh pr list` and `gh pr view <n>` answer from the
// pull requests in $FAKE_DIR/prs.json, filtered through `--jq` like gh does.
// Every other call is appended to $FAKE_DIR/calls.log, one line per call.
const FAKE_GH = `#!/usr/bin/env bash
set -euo pipefail
if [ "$1" = pr ] && { [ "$2" = list ] || [ "$2" = view ]; }; then
  sub="$2"
  shift 2
  number=""
  filter=.
  while [ $# -gt 0 ]; do
    case "$1" in
      --jq) filter="$2"; shift 2 ;;
      --*) shift 2 ;;
      *) number="$1"; shift ;;
    esac
  done
  if [ "$sub" = view ]; then
    jq -r --argjson n "$number" ".[] | select(.number == \\$n) | $filter" "$FAKE_DIR/prs.json"
  else
    jq -r "$filter" "$FAKE_DIR/prs.json"
  fi
  exit 0
fi
echo "$*" >> "$FAKE_DIR/calls.log"
`;

interface PullRequest {
  number: number;
  files?: Record<string, string>;
  isDraft?: boolean;
  isCrossRepository?: boolean;
  labels?: string[];
  mergeStateStatus?: string;
}

interface Workflow {
  on: Record<string, { branches?: string[] } | null>;
}

const workflowTriggers = new Map(
  readdirSync(workflowsDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => [name, (Bun.YAML.parse(readFileSync(join(workflowsDir, name), "utf8")) as Workflow).on]),
);

// The workflows GitHub starts on a push to main, read from their `on:`
// triggers. A bare `push:` filters no branch, so it covers main too.
const mainPushWorkflows = [...workflowTriggers]
  .filter(([, on]) => "push" in on && (on["push"]?.branches?.includes("main") ?? true))
  .map(([name]) => name)
  .sort();

let workDir: string;
let originDir: string;
let cloneDir: string;

const gitEnv = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
};

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", env: { ...process.env, ...gitEnv } });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }

  return result.stdout.trim();
}

function commitFiles(repo: string, files: Record<string, string>, message: string): string {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), contents);
  }

  git(repo, "add", "--all");
  git(repo, "commit", "--quiet", "-m", message);

  return git(repo, "rev-parse", "HEAD");
}

/**
 * Builds an origin whose main holds the given files and whose
 * refs/pull/<n>/head carries each PR's files on top of main, like GitHub's
 * pull refs, then clones main the way the workflow's checkout does. Returns
 * each PR's head SHA.
 */
function setUpRepository(mainFiles: Record<string, string>, pullRequests: PullRequest[]): Map<number, string> {
  const seedDir = join(workDir, "seed");
  const heads = new Map<number, string>();

  git(workDir, "init", "--quiet", "--bare", "--initial-branch=main", originDir);
  git(workDir, "init", "--quiet", "--initial-branch=main", seedDir);
  commitFiles(seedDir, mainFiles, "main");
  git(seedDir, "push", "--quiet", originDir, "main");

  for (const pullRequest of pullRequests) {
    git(seedDir, "switch", "--quiet", "--create", `pr-${pullRequest.number}`, "main");

    heads.set(
      pullRequest.number,
      commitFiles(seedDir, pullRequest.files ?? { [`content/pr-${pullRequest.number}.md`]: "text\n" }, "pr"),
    );

    git(seedDir, "push", "--quiet", originDir, `HEAD:refs/pull/${pullRequest.number}/head`);
  }

  git(workDir, "clone", "--quiet", originDir, cloneDir);

  writeFileSync(
    join(workDir, "prs.json"),
    JSON.stringify(
      pullRequests.map((pullRequest) => ({
        number: pullRequest.number,
        headRefOid: heads.get(pullRequest.number),
        isDraft: pullRequest.isDraft ?? false,
        isCrossRepository: pullRequest.isCrossRepository ?? false,
        labels: (pullRequest.labels ?? []).map((name) => ({ name })),
        mergeStateStatus: pullRequest.mergeStateStatus ?? "CLEAN",
      })),
    ),
  );

  return heads;
}

function runScript(...args: string[]): { status: number | null; output: Record<string, string>; calls: string[] } {
  const outputPath = join(workDir, "github-output");
  const callLog = join(workDir, "calls.log");

  writeFileSync(join(workDir, "gh"), FAKE_GH);
  chmodSync(join(workDir, "gh"), 0o755);
  writeFileSync(outputPath, "");

  const result = spawnSync("bash", [scriptPath, ...args], {
    cwd: cloneDir,
    encoding: "utf8",
    env: {
      ...process.env,
      ...gitEnv,
      PATH: `${workDir}:${process.env["PATH"] ?? ""}`,
      FAKE_DIR: workDir,
      GITHUB_OUTPUT: outputPath,
    },
  });
  const output = Object.fromEntries(
    readFileSync(outputPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("=", 2) as [string, string]),
  );
  const calls = existsSync(callLog) ? readFileSync(callLog, "utf8").split("\n").filter(Boolean) : [];

  return { status: result.status, output, calls };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "merge-queue-"));
  originDir = join(workDir, "origin.git");
  cloneDir = join(workDir, "clone");
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/merge-queue.sh next", () => {
  test("picks the oldest same-repo, ready, unheld pull request whose required checks pass", () => {
    const heads = setUpRepository({ "README.md": "site\n" }, [
      { number: 9 },
      { number: 3, isDraft: true },
      { number: 4, isCrossRepository: true },
      { number: 5, labels: ["hold"] },
      { number: 6, mergeStateStatus: "BLOCKED" },
      { number: 7, labels: ["stage/100-merge-queue"] },
    ]);

    const { status, output } = runScript("next");

    expect(status).toBe(0);
    expect(output).toEqual({ number: "7", head: heads.get(7) ?? "", main: git(cloneDir, "rev-parse", "HEAD") });
  });

  test("leaves a high-risk pull request for the maintainer and picks the next one", () => {
    const heads = setUpRepository({ "README.md": "site\n" }, [
      { number: 2, files: { "front-end/src/app.ts": "export {};\n", ".github/workflows/ci.yml": "name: CI\n" } },
      { number: 8, files: { "front-end/src/app.ts": "export {};\n" } },
    ]);

    const { status, output } = runScript("next");

    expect(status).toBe(0);
    expect(output["number"]).toBe("8");
    expect(output["head"]).toBe(heads.get(8));
  });

  // Moving a workflow out of .github/ still edits CI; git's rename detection
  // would list only the new, medium-risk path.
  test("rates a file moved out of a high-risk path by its old path", () => {
    setUpRepository({ "scripts/release.sh": "#!/bin/sh\necho release\n" }, []);
    rmSync(join(workDir, "seed", "scripts"), { recursive: true });
    git(join(workDir, "seed"), "switch", "--quiet", "--create", "pr-5", "main");
    commitFiles(join(workDir, "seed"), { "tools/release.sh": "#!/bin/sh\necho release\n" }, "move");
    git(join(workDir, "seed"), "push", "--quiet", originDir, "HEAD:refs/pull/5/head");

    writeFileSync(
      join(workDir, "prs.json"),
      JSON.stringify([
        {
          number: 5,
          headRefOid: git(join(workDir, "seed"), "rev-parse", "HEAD"),
          isDraft: false,
          isCrossRepository: false,
          labels: [],
          mergeStateStatus: "CLEAN",
        },
      ]),
    );

    const { status, output } = runScript("next");

    expect(status).toBe(0);
    expect(output).toEqual({});
  });

  test("picks nothing when no pull request is ready to merge", () => {
    setUpRepository({ "README.md": "site\n" }, [{ number: 4, mergeStateStatus: "BLOCKED" }]);

    const { status, output, calls } = runScript("next");

    expect(status).toBe(0);
    expect(output).toEqual({});
    expect(calls).toEqual([]);
  });
});

describe("scripts/merge-queue.sh land", () => {
  // A merge made with GITHUB_TOKEN starts no push workflow, so land has to
  // start every workflow that runs on a push to main, or that gate never runs
  // for queue merges.
  test("merges the verified head, then starts each of main's push workflows and the next queue run", () => {
    const heads = setUpRepository({ "README.md": "site\n" }, [{ number: 7 }]);
    const head = heads.get(7) ?? "";

    const { status, calls } = runScript("land", "7", head, git(cloneDir, "rev-parse", "HEAD"));

    expect(status).toBe(0);
    expect(calls[0]).toBe(`pr merge 7 --merge --match-head-commit ${head}`);
    expect(calls.at(-1)).toBe("workflow run merge-queue.yml --ref main");
    expect(calls.slice(1, -1).sort()).toEqual(mainPushWorkflows.map((name) => `workflow run ${name} --ref main`));
  });

  // `gh workflow run` fails on a workflow without a workflow_dispatch trigger.
  test.each(mainPushWorkflows)("can start %s, which runs on a push to main", (name) => {
    expect(workflowTriggers.get(name)).toHaveProperty("workflow_dispatch");
  });

  test("does not merge when main moved after verification, and queues a re-run against the new main", () => {
    const heads = setUpRepository({ "README.md": "site\n" }, [{ number: 7 }]);
    const verifiedMain = git(cloneDir, "rev-parse", "HEAD");

    commitFiles(join(workDir, "seed"), { "docs/other.md": "other\n" }, "other");
    git(join(workDir, "seed"), "push", "--quiet", originDir, "HEAD:main");

    const { status, calls } = runScript("land", "7", heads.get(7) ?? "", verifiedMain);

    expect(status).toBe(0);
    expect(calls).toEqual(["workflow run merge-queue.yml --ref main"]);
  });

  test.each<[string, Partial<PullRequest>]>([
    ["put on hold", { labels: ["hold"] }],
    ["turned back into a draft", { isDraft: true }],
    ["no longer passing its required checks", { mergeStateStatus: "BLOCKED" }],
  ])("does not merge a pull request %s during verification", (_, change) => {
    const heads = setUpRepository({ "README.md": "site\n" }, [{ number: 7, ...change }]);

    const { status, calls } = runScript("land", "7", heads.get(7) ?? "", git(cloneDir, "rev-parse", "HEAD"));

    expect(status).toBe(0);
    expect(calls).toEqual(["workflow run merge-queue.yml --ref main"]);
  });
});

describe("scripts/merge-queue.sh reject", () => {
  test("holds the pull request, links the failed run and moves on to the next one", () => {
    setUpRepository({ "README.md": "site\n" }, [{ number: 7 }]);

    const { status, calls } = runScript("reject", "7", RUN_URL);

    expect(status).toBe(0);
    expect(calls).toHaveLength(3);
    expect(calls[0]).toBe("pr edit 7 --add-label hold");
    expect(calls[1]).toStartWith("pr comment 7 --body ");
    expect(calls[1]).toContain(RUN_URL);
    expect(calls[2]).toBe("workflow run merge-queue.yml --ref main");
  });
});
