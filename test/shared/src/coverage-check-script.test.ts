import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/coverage-check.sh");

let stubDir: string;

// Stub `bun`: `bun test … --coverage` prints a Bun-style coverage table with
// STUB_FUNCS / STUB_LINES as the `All files` row, omits that row when
// STUB_NO_SUMMARY=1, and exits with STUB_TEST_STATUS (default 0).
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
echo "---------------------|---------|---------|-------------------"
echo "File                 | % Funcs | % Lines | Uncovered Line #s"
echo "---------------------|---------|---------|-------------------"
if [ "\${STUB_NO_SUMMARY:-0}" != 1 ]; then
  echo "All files            |  \${STUB_FUNCS} |  \${STUB_LINES} |"
fi
echo " src/example.ts      |  \${STUB_FUNCS} |  \${STUB_LINES} | 12-14"
exit "\${STUB_TEST_STATUS:-0}"
`,
  );

  chmodSync(stubPath, 0o755);
}

function runCheck(
  floors: { funcs: string; lines: string },
  env: Record<string, string>,
): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync("bash", [scriptPath, "shared", floors.funcs, floors.lines], {
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

  test("fails when the coverage report has no summary row", () => {
    const { status, stderr } = runCheck(
      { funcs: "0", lines: "0" },
      { STUB_FUNCS: "100.00", STUB_LINES: "100.00", STUB_NO_SUMMARY: "1" },
    );

    expect(status).not.toBe(0);
    expect(stderr).toContain("Coverage summary row not found in bun test output");
  });
});
