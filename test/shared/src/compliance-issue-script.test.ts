import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/compliance-issue.sh");
const runUrl = "https://github.com/owner/repo/actions/runs/123";

let workDir: string;
let stubDir: string;
let callLog: string;
let bodyLog: string;
let reportPath: string;

// Stub `gh`: every invocation's arguments go on one line of $STUB_GH_LOG, the
// contents of any --body-file go to $STUB_GH_BODIES, and `gh issue list`
// prints $STUB_OPEN_ISSUE (the number of the open tracking issue, if any).
function writeGhStub(): void {
  const stubPath = join(stubDir, "gh");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$STUB_GH_LOG"
prev=""
for arg in "$@"; do
  if [ "$prev" = --body-file ]; then cat "$arg" >> "$STUB_GH_BODIES"; fi
  prev="$arg"
done
if [ "$1 $2" = "issue list" ]; then printf '%s\\n' "\${STUB_OPEN_ISSUE:-}"; fi
exit 0
`,
  );

  chmodSync(stubPath, 0o755);
}

function runScript(
  args: string[],
  env: Record<string, string> = {},
): { status: number | null; calls: string[]; bodies: string; stderr: string } {
  const result = spawnSync("bash", [scriptPath, ...args], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      REPO: "owner/repo",
      RUN_URL: runUrl,
      STUB_GH_LOG: callLog,
      STUB_GH_BODIES: bodyLog,
      ...env,
    },
  });

  const calls = existsSync(callLog) ? readFileSync(callLog, "utf8").trimEnd().split("\n") : [];
  const bodies = existsSync(bodyLog) ? readFileSync(bodyLog, "utf8") : "";

  return { status: result.status, calls, bodies, stderr: result.stderr };
}

// Calls that change something: everything but the read-only `gh issue list`.
function writes(calls: string[]): string[] {
  return calls.filter((call) => !call.startsWith("issue list"));
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "compliance-issue-"));
  stubDir = join(workDir, "bin");
  callLog = join(workDir, "gh-calls.log");
  bodyLog = join(workDir, "gh-bodies.log");
  reportPath = join(workDir, "nightly-compliance.md");
  mkdirSync(stubDir);
  writeFileSync(reportPath, "# Nightly compliance\n\n| Dependency audit (high+) | ❌ fail |\n");
  writeGhStub();
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/compliance-issue.sh", () => {
  test("opens a labelled tracking issue with the report when a run fails and none is open", () => {
    const { status, calls, bodies } = runScript(["failure", reportPath]);

    expect(status).toBe(0);
    expect(calls[0]).toMatch(/^issue list --repo owner\/repo --state open --label nightly-compliance\b/);
    const created = writes(calls).filter((call) => call.startsWith("issue create"));

    expect(created).toHaveLength(1);
    expect(created[0]).toContain("--repo owner/repo");
    expect(created[0]).toContain("--label nightly-compliance");
    expect(bodies).toContain(runUrl);
    expect(bodies).toContain("| Dependency audit (high+) | ❌ fail |");
  });

  test("comments on the open tracking issue instead of opening a second one when a run fails again", () => {
    const { status, calls, bodies } = runScript(["failure", reportPath], { STUB_OPEN_ISSUE: "42" });

    expect(status).toBe(0);
    expect(writes(calls)).toEqual([expect.stringMatching(/^issue comment 42 --repo owner\/repo --body-file /)]);
    expect(bodies).toContain(runUrl);
    expect(bodies).toContain("| Dependency audit (high+) | ❌ fail |");
  });

  test("still opens the issue, pointing at the run, when the failed run left no report", () => {
    const { status, calls, bodies } = runScript(["failure", join(workDir, "missing.md")]);

    expect(status).toBe(0);
    expect(writes(calls).filter((call) => call.startsWith("issue create"))).toHaveLength(1);
    expect(bodies).toContain(runUrl);
  });

  test("closes the open tracking issue with a note when a run passes again", () => {
    const { status, calls } = runScript(["success", reportPath], { STUB_OPEN_ISSUE: "42" });

    expect(status).toBe(0);
    const closed = writes(calls);

    expect(closed).toHaveLength(1);
    expect(closed[0]).toMatch(/^issue close 42 --repo owner\/repo --comment /);
    expect(closed[0]).toContain(runUrl);
  });

  test("changes nothing when a run passes and no tracking issue is open", () => {
    const { status, calls } = runScript(["success", reportPath]);

    expect(status).toBe(0);
    expect(writes(calls)).toEqual([]);
  });

  test("rejects a conclusion other than success or failure without touching issues", () => {
    const { status, calls, stderr } = runScript(["cancelled", reportPath]);

    expect(status).not.toBe(0);
    expect(calls).toEqual([]);
    expect(stderr).toContain("cancelled");
  });
});
