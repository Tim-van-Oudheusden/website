import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/quality-report.sh");

let stubDir: string;

// Stub `bun`: `bun run <gate>` prints a line of output and exits 1 when
// STUB_FAIL_<GATE>=1, or when it is not run from the repository root. `bun test …
// --coverage` prints a Bun-style coverage table to stderr, as Bun does, whose
// numbers depend on the workspace it runs in; it fails unless it was asked for
// that workspace's tests with coverage. STUB_BROKEN_WORKSPACE fails before the
// table, STUB_FAILING_WORKSPACE prints the table and then fails, and
// STUB_NO_TABLE_WORKSPACE passes with no table.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
if [ "$1" = run ]; then
  echo "output of the $2 gate"
  [ -f scripts/quality-report.sh ] || exit 1
  var="STUB_FAIL_$(printf '%s' "$2" | tr '[:lower:]-' '[:upper:]_')"
  [ "\${!var:-0}" = 1 ] && exit 1
  exit 0
fi
exec 1>&2
workspace="$(basename "$PWD")"
[ "$*" = "test ../test/$workspace --coverage" ] || exit 1
if [ "$workspace" = "\${STUB_BROKEN_WORKSPACE:-}" ]; then
  echo "error: 1 test failed"
  exit 1
fi
[ "$workspace" = "\${STUB_NO_TABLE_WORKSPACE:-}" ] && exit 0
case "$(basename "$PWD")" in
  back-end) funcs=97.50; lines=93.10 ;;
  shared) funcs=100.00; lines=98.25 ;;
  front-end) funcs=92.00; lines=91.40 ;;
esac
echo "---------------------|---------|---------|-------------------"
echo "File                 | % Funcs | % Lines | Uncovered Line #s"
echo "---------------------|---------|---------|-------------------"
echo "All files            |  $funcs |  $lines |"
[ "$workspace" != "\${STUB_FAILING_WORKSPACE:-}" ]
`,
  );

  chmodSync(stubPath, 0o755);
}

function runScript(env: Record<string, string> = {}): { status: number | null; report: string; log: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: stubDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      GITHUB_SHA: "abc1234",
      ...env,
    },
  });

  return { status: result.status, report: result.stdout, log: result.stderr };
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "quality-report-"));
  writeBunStub();
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("scripts/quality-report.sh", () => {
  test("reports every gate as passing and each workspace's coverage as a Markdown table", () => {
    const { status, report } = runScript();

    expect(status).toBe(0);

    expect(report).toBe(
      [
        "# Quality report",
        "",
        "Commit: `abc1234`",
        "",
        "## Quality gates",
        "",
        "| Gate | Result |",
        "| ---- | ------ |",
        "| `bun run lint` | ✅ pass |",
        "| `bun run typecheck` | ✅ pass |",
        "| `bun run test` | ✅ pass |",
        "| `bun run build` | ✅ pass |",
        "",
        "## Unit-test coverage",
        "",
        "| Workspace | Functions | Lines |",
        "| --------- | --------- | ----- |",
        "| back-end | 97.50% | 93.10% |",
        "| shared | 100.00% | 98.25% |",
        "| front-end | 92.00% | 91.40% |",
        "",
      ].join("\n"),
    );
  });

  // quality-report.yml redirects stdout into the published report.
  test("keeps gate and test output on stderr, out of the report", () => {
    const { log } = runScript();

    expect(log).toContain("output of the lint gate");
    expect(log).toContain("All files            |  97.50 |  93.10 |");
  });

  test("marks a failing gate, still runs the remaining gates, and exits non-zero", () => {
    const { status, report } = runScript({ STUB_FAIL_LINT: "1" });

    expect(status).not.toBe(0);
    expect(report).toContain("| `bun run lint` | ❌ fail |");
    expect(report).toContain("| `bun run build` | ✅ pass |");
    expect(report).toContain("| front-end | 92.00% | 91.40% |");
  });

  test("reports n/a and exits non-zero when a workspace's coverage run fails", () => {
    const { status, report } = runScript({ STUB_BROKEN_WORKSPACE: "shared" });

    expect(status).not.toBe(0);
    expect(report).toContain("| shared | ❌ n/a | ❌ n/a |");
    expect(report).toContain("| front-end | 92.00% | 91.40% |");
  });

  test.each([
    ["fails after printing its table", { STUB_FAILING_WORKSPACE: "shared" }],
    ["passes without printing a table", { STUB_NO_TABLE_WORKSPACE: "shared" }],
  ])("reports n/a and exits non-zero when a workspace's test run %s", (_name, env) => {
    const { status, report } = runScript(env);

    expect(status).not.toBe(0);
    expect(report).toContain("| shared | ❌ n/a | ❌ n/a |");
  });
});
