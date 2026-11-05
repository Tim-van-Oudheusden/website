import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/coverage-check.sh");

let stubDir: string;

// Stub `bun`: `bun test … --coverage` prints a Bun-style coverage table with
// STUB_FUNCS / STUB_LINES as the `All files` row, omits that row when
// STUB_NO_SUMMARY=1, and exits with STUB_TEST_STATUS (default 0). The table goes
// to stderr, as Bun's does. Each run appends its directory name and arguments to
// bun-calls.log.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
echo "$(basename "$PWD") $*" >> "${stubDir}/bun-calls.log"
exec 1>&2
echo "---------------------|---------|---------|-------------------"
echo "File                 | % Funcs | % Lines | Uncovered Line #s"
echo "---------------------|---------|---------|-------------------"
if [ "\${STUB_NO_SUMMARY:-0}" != 1 ]; then
  echo "All files            |  \${STUB_FUNCS} |  \${STUB_LINES} |"
fi
echo " src/example.ts      |  \${STUB_FUNCS} |  \${STUB_LINES} | 12-14"
if [ "\${STUB_BULK_REPORT:-0}" = 1 ]; then
  yes " src/bulk.ts          |  100.00 |  100.00 |" | head -n 20000
fi
exit "\${STUB_TEST_STATUS:-0}"
`,
  );

  chmodSync(stubPath, 0o755);
}

function runArgs(
  args: string[],
  env: Record<string, string> = {},
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bash", [scriptPath, ...args], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      ...env,
    },
  });

  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function runCheck(
  floors: { funcs: string; lines: string },
  env: Record<string, string>,
): { status: number | null; stdout: string; stderr: string } {
  return runArgs(["shared", floors.funcs, floors.lines], env);
}

function bunCalls(): string[] {
  const log = join(stubDir, "bun-calls.log");

  return existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "coverage-check-"));
  writeBunStub();
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("scripts/coverage-check.sh", () => {
  test("passes and prints the measured coverage against the floors when both meet them", () => {
    const { status, stdout } = runCheck(
      { funcs: "90", lines: "90" },
      { STUB_FUNCS: "95.50", STUB_LINES: "90.00" },
    );

    expect(status).toBe(0);
    expect(stdout).toContain("All files            |  95.50 |  90.00 |");

    expect(stdout).toContain(
      "Coverage (shared): funcs 95.50%, lines 90.00% (floors: 90% funcs, 90% lines)",
    );
  });

  test("runs the workspace's own tests with coverage, from inside the workspace", () => {
    runCheck({ funcs: "90", lines: "90" }, { STUB_FUNCS: "95.50", STUB_LINES: "90.00" });

    expect(bunCalls()).toEqual(["shared test ../test/shared --coverage"]);
  });

  test("passes when both figures sit exactly on their floors", () => {
    const { status } = runCheck({ funcs: "90", lines: "80" }, { STUB_FUNCS: "90.00", STUB_LINES: "80.00" });

    expect(status).toBe(0);
  });

  test("compares functions with the functions floor and lines with the lines floor", () => {
    const { status } = runCheck({ funcs: "95", lines: "80" }, { STUB_FUNCS: "90.00", STUB_LINES: "96.00" });

    expect(status).not.toBe(0);
  });

  // A floor that defaulted to 0 would pass any coverage at all.
  test.each([
    ["a workspace", [], "usage: coverage-check.sh"],
    ["a functions floor", ["shared"], "min funcs % required"],
    ["a lines floor", ["shared", "90"], "min lines % required"],
  ])("refuses to run without %s", (_name, args, message) => {
    const { status, stderr } = runArgs(args, { STUB_FUNCS: "0.00", STUB_LINES: "0.00" });

    expect(status).not.toBe(0);
    expect(stderr).toContain(message);
    expect(bunCalls()).toEqual([]);
  });

  test("fails without running anything when the workspace does not exist", () => {
    const { status } = runArgs(["no-such-workspace", "90", "90"], { STUB_FUNCS: "100.00", STUB_LINES: "100.00" });

    expect(status).not.toBe(0);
    expect(bunCalls()).toEqual([]);
  });

  test("fails when function coverage is below its floor", () => {
    const { status, stderr } = runCheck(
      { funcs: "90", lines: "90" },
      { STUB_FUNCS: "89.99", STUB_LINES: "100.00" },
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("Coverage (shared) is below the configured floor");
  });

  test("fails when line coverage is below its floor", () => {
    const { status, stderr } = runCheck(
      { funcs: "90", lines: "90" },
      { STUB_FUNCS: "100.00", STUB_LINES: "89.99" },
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("Coverage (shared) is below the configured floor");
  });

  test("exits with the test run's status and still prints its report when bun test fails", () => {
    const { status, stdout, stderr } = runCheck(
      { funcs: "90", lines: "90" },
      { STUB_FUNCS: "100.00", STUB_LINES: "100.00", STUB_TEST_STATUS: "3" },
    );

    expect(status).toBe(3);
    expect(stdout).toContain("All files            |  100.00 |  100.00 |");
    expect(stderr).toContain("bun test failed with status 3");
  });

  test("passes on a report far larger than a pipe buffer with the summary row near the top", () => {
    const { status, stderr } = runCheck(
      { funcs: "90", lines: "90" },
      { STUB_FUNCS: "95.50", STUB_LINES: "90.00", STUB_BULK_REPORT: "1" },
    );

    expect(stderr).not.toContain("Broken pipe");
    expect(status).toBe(0);
  });

  test("fails when the coverage report has no summary row", () => {
    const { status, stderr } = runCheck(
      { funcs: "0", lines: "0" },
      { STUB_FUNCS: "100.00", STUB_LINES: "100.00", STUB_NO_SUMMARY: "1" },
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("Coverage summary row not found in bun test output");
  });
});
