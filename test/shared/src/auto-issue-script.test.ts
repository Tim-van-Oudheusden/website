import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/auto-issue.sh");

const TITLE = "Nightly compliance failing";
const RUN_URL = "https://github.com/owner/website/actions/runs/42";
const REPORT = "# Nightly compliance\n\n| Check | Result |\n| ----- | ------ |\n| Dependency audit (high+) | ❌ fail |\n";

// Stands in for the gh CLI. `gh issue list` answers with the open issues in
// $FAKE_DIR/open-issues.json, filtered through `--jq` like gh does. Every other
// call is appended to $FAKE_DIR/calls.log as NUL-terminated arguments ending in
// a record separator, with a `--body-file <path>` replaced by `--body
// <contents>` (the file is gone by the time the test reads the log).
const FAKE_GH = `#!/usr/bin/env bash
set -euo pipefail
if [ "$1 $2" = "issue list" ]; then
  filter=.
  while [ $# -gt 0 ]; do
    if [ "$1" = --jq ]; then filter="$2"; shift; fi
    shift
  done
  jq -r "$filter" "$FAKE_DIR/open-issues.json"
  exit 0
fi
args=()
while [ $# -gt 0 ]; do
  if [ "$1" = --body-file ]; then args+=(--body "$(cat "$2")"); shift 2; else args+=("$1"); shift; fi
done
printf '%s\\0' "\${args[@]}" >> "$FAKE_DIR/calls.log"
printf '\\036' >> "$FAKE_DIR/calls.log"
`;

interface GhCall {
  /** Subcommand and positional arguments, e.g. `issue comment 7`. */
  command: string;
  flags: Record<string, string>;
}

let workDir: string;

function parseCall(args: string[]): GhCall {
  const positional: string[] = [];
  const flags: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";

    if (arg.startsWith("--")) {
      flags[arg.slice(2)] = args[index + 1] ?? "";
      index += 1;
    } else {
      positional.push(arg);
    }
  }

  return { command: positional.join(" "), flags };
}

function runScript(
  openIssues: { number: number; title: string }[],
  reportPath = join(workDir, "report.md"),
): { status: number | null; calls: GhCall[] } {
  writeFileSync(join(workDir, "gh"), FAKE_GH);
  chmodSync(join(workDir, "gh"), 0o755);
  writeFileSync(join(workDir, "open-issues.json"), JSON.stringify(openIssues));

  const result = spawnSync("bash", [scriptPath, TITLE, reportPath, RUN_URL], {
    cwd: workDir,
    encoding: "utf8",
    env: { ...process.env, PATH: `${workDir}:${process.env["PATH"] ?? ""}`, FAKE_DIR: workDir },
  });
  const log = join(workDir, "calls.log");
  const records = existsSync(log) ? readFileSync(log, "utf8").split("\x1e").slice(0, -1) : [];
  const calls = records.map((record) => parseCall(record.split("\0").slice(0, -1)));

  return { status: result.status, calls };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "auto-issue-"));
  writeFileSync(join(workDir, "report.md"), REPORT);
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/auto-issue.sh", () => {
  test("opens an issue with the run link and report when none with the title is open", () => {
    const { status, calls } = runScript([{ number: 3, title: "Nightly compliance failing again" }]);

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("issue create");
    expect(calls[0]?.flags["title"]).toBe(TITLE);
    expect(calls[0]?.flags["body"]).toContain(RUN_URL);
    expect(calls[0]?.flags["body"]).toContain(REPORT.trim());
  });

  test("comments the run link and report on the open issue with the title instead of opening another", () => {
    const { status, calls } = runScript([
      { number: 3, title: "Nightly compliance failing again" },
      { number: 7, title: TITLE },
    ]);

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("issue comment 7");
    expect(calls[0]?.flags["body"]).toContain(RUN_URL);
    expect(calls[0]?.flags["body"]).toContain(REPORT.trim());
  });

  // A run that fails before writing its report (nightly compliance's
  // frozen-lockfile install) uploads no artifact; the failure still needs an issue.
  test("still opens the issue with the run link when the run left no report", () => {
    const { status, calls } = runScript([], join(workDir, "missing.md"));

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.command).toBe("issue create");
    expect(calls[0]?.flags["body"]).toContain(RUN_URL);
  });
});
