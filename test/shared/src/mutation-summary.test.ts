import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/mutation-summary.ts");

const HEADER = [
  "| Workspace | Killed | Timeout | Survived | No coverage | Errors | Mutation score |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
];

let workDir: string;

/** Writes a Stryker JSON report (mutation-testing-report-schema) holding one file per entry of `files`. */
function writeReport(name: string, files: Record<string, string[]>): string {
  const reportPath = join(workDir, `${name}.json`);
  const report = {
    schemaVersion: "2",
    thresholds: { high: 80, low: 60 },
    files: Object.fromEntries(
      Object.entries(files).map(([file, statuses]) => [
        file,
        {
          language: "typescript",
          source: "",
          mutants: statuses.map((status, index) => ({
            id: `${file}-${String(index)}`,
            mutatorName: "ConditionalExpression",
            replacement: "true",
            location: { start: { line: 1, column: 1 }, end: { line: 1, column: 2 } },
            status,
          })),
        },
      ]),
    ),
  };

  writeFileSync(reportPath, JSON.stringify(report));

  return reportPath;
}

function runSummary(...reports: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [scriptPath, ...reports], { cwd: rootPath, encoding: "utf8" });

  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function tableRows(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.startsWith("|"));
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "mutation-summary-"));
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/mutation-summary.ts", () => {
  test("scores detected mutants against all valid ones, leaving errors and ignored mutants out", () => {
    const report = writeReport("back-end", {
      "back-end/src/app.ts": ["Killed", "Killed", "Survived", "CompileError", "Ignored"],
      "back-end/src/core/rate-limit.ts": ["Killed", "Timeout", "NoCoverage", "RuntimeError"],
    });

    const { status, stdout } = runSummary(report);

    expect(status).toBe(0);
    // (3 killed + 1 timeout) / (4 detected + 1 survived + 1 no coverage) = 66.67%
    expect(tableRows(stdout)).toEqual([...HEADER, "| back-end | 3 | 1 | 1 | 1 | 2 | 66.67% |"]);
  });

  test("prints one row per report, named after the report file", () => {
    const backEnd = writeReport("back-end", { "back-end/src/app.ts": ["Killed", "Survived"] });
    const shared = writeReport("shared", { "shared/src/tags.ts": ["Killed"] });

    const { status, stdout } = runSummary(backEnd, shared);

    expect(status).toBe(0);

    expect(tableRows(stdout)).toEqual([
      ...HEADER,
      "| back-end | 1 | 0 | 1 | 0 | 0 | 50.00% |",
      "| shared | 1 | 0 | 0 | 0 | 0 | 100.00% |",
    ]);
  });

  test("reports no score when no mutant could be tested", () => {
    const report = writeReport("shared", { "shared/src/tags.ts": ["CompileError", "Ignored"] });

    const { status, stdout } = runSummary(report);

    expect(status).toBe(0);
    expect(tableRows(stdout)).toEqual([...HEADER, "| shared | 0 | 0 | 0 | 0 | 1 | n/a |"]);
  });

  test("fails naming the report when one is missing", () => {
    const missing = join(workDir, "front-end.json");

    const { status, stderr } = runSummary(missing);

    expect(status).toBe(1);
    expect(stderr).toContain(missing);
  });
});
