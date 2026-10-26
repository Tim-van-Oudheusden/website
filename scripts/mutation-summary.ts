#!/usr/bin/env bun
// Summarise Stryker mutation reports as a Markdown table.
//
// Usage:
//   bun scripts/mutation-summary.ts reports/mutation/<workspace>.json [...]
//
// Prints one row per JSON report (named after the file), counting mutants by
// status. The mutation score is Stryker's: detected (killed + timeout) over
// valid (detected + survived + no coverage). Compile and runtime errors are
// counted but left out of the score, as are ignored and pending mutants. A
// workspace with no valid mutant has no score (`n/a`). Exits 1 if a report
// can't be read.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

interface MutationReport {
  files: Record<string, { mutants: { status: string }[] }>;
}

interface Counts {
  killed: number;
  timeout: number;
  survived: number;
  noCoverage: number;
  errors: number;
}

// Stryker statuses counted in the table; Ignored and Pending are left out.
const COUNTED_STATUSES: Partial<Record<string, keyof Counts>> = {
  Killed: "killed",
  Timeout: "timeout",
  Survived: "survived",
  NoCoverage: "noCoverage",
  CompileError: "errors",
  RuntimeError: "errors",
};

function countStatuses(report: MutationReport): Counts {
  const counts: Counts = { killed: 0, timeout: 0, survived: 0, noCoverage: 0, errors: 0 };

  for (const { mutants } of Object.values(report.files)) {
    for (const { status } of mutants) {
      const key = COUNTED_STATUSES[status];

      if (key !== undefined) {
        counts[key] += 1;
      }
    }
  }

  return counts;
}

function formatRow(workspace: string, counts: Counts): string {
  const detected = counts.killed + counts.timeout;
  const valid = detected + counts.survived + counts.noCoverage;
  const score = valid === 0 ? "n/a" : `${(detected / valid * 100).toFixed(2)}%`;
  const cells = [counts.killed, counts.timeout, counts.survived, counts.noCoverage, counts.errors].map(String);

  return `| ${[workspace, ...cells, score].join(" | ")} |`;
}

const rows: string[] = [];
let failed = false;

for (const reportPath of process.argv.slice(2)) {
  try {
    const report = JSON.parse(readFileSync(reportPath, "utf8")) as MutationReport;

    rows.push(formatRow(basename(reportPath, ".json"), countStatuses(report)));
  } catch (error) {
    console.error(`cannot read mutation report ${reportPath}: ${String(error)}`);
    failed = true;
  }
}

process.stdout.write(`${[
  "## Mutation testing",
  "",
  "| Workspace | Killed | Timeout | Survived | No coverage | Errors | Mutation score |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...rows,
].join("\n")}\n`);

process.exit(failed ? 1 : 0);
