#!/usr/bin/env bun
// Audit trail of what reached `main`, as a Markdown report: every PR merged in a
// window, attributed to its source (a Hive agent, Claude Code in CI, Dependabot,
// or other), with the agent and model a Hive PR signs, who opened it and who
// merged it.
//
// Usage:
//   bun scripts/ai-audit-report.ts <since YYYY-MM-DD> <prs.json>
//
// <prs.json> is `gh pr list --state merged --json
// number,title,author,headRefName,mergedAt,mergedBy,body`. The window runs from
// <since> (UTC midnight) to now. Exits 1 if the input can't be read, 2 on bad
// usage.
import { readFileSync } from "node:fs";

import type { Attribution } from "./pr-source";
import { attribute, SOURCES } from "./pr-source";

interface PullRequest {
  number: number;
  title: string;
  author: { login: string };
  headRefName: string;
  mergedAt: string;
  mergedBy: { login: string } | null;
  body: string;
}

interface Entry {
  pr: PullRequest;
  attribution: Attribution;
}

/** Escapes `|` so text from a PR cannot add or shift table columns. */
function cell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function sourceSection(entries: Entry[]): string[] {
  return [
    "## By source",
    "",
    "| Source | Merged PRs |",
    "| --- | ---: |",
    ...SOURCES.map((source) => `| ${source} | ${entries.filter((entry) => entry.attribution.source === source).length} |`),
    `| **All** | ${entries.length} |`,
  ];
}

function mergerSection(entries: Entry[]): string[] {
  const counts = new Map<string | null, number>();

  for (const { pr } of entries) {
    const login = pr.mergedBy?.login ?? null;

    counts.set(login, (counts.get(login) ?? 0) + 1);
  }

  // Most merges first; a merge with no recorded merger is listed last so it stands out.
  const rows = [...counts]
    .sort(([loginA, countA], [loginB, countB]) => {
      if (loginA === null || loginB === null) {
        return Number(loginA === null) - Number(loginB === null);
      }

      return countB - countA || loginA.localeCompare(loginB);
    })
    .map(([login, count]) => `| ${login === null ? "Unknown (no merger recorded)" : cell(login)} | ${count} |`);

  return [
    "## Merged by",
    "",
    "| Account | Merged PRs |",
    "| --- | ---: |",
    ...rows,
  ];
}

function ledgerSection(entries: Entry[]): string[] {
  const rows = entries.map(({ pr, attribution: { source, agent, model } }) => {
    const merged = new Date(pr.mergedAt).toISOString().slice(0, 16).replace("T", " ");

    return [
      `#${pr.number}`,
      merged,
      source,
      cell(agent),
      cell(model),
      cell(pr.author.login),
      pr.mergedBy === null ? "—" : cell(pr.mergedBy.login),
      `\`${cell(pr.headRefName)}\``,
      cell(pr.title),
    ].join(" | ");
  });

  return [
    "## Ledger",
    "",
    "| PR | Merged (UTC) | Source | Agent | Model | Author | Merged by | Branch | Title |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row} |`),
  ];
}

const [sinceArg, prsPath] = process.argv.slice(2);

if (sinceArg === undefined || prsPath === undefined) {
  console.error("usage: bun scripts/ai-audit-report.ts <since YYYY-MM-DD> <prs.json>");
  process.exit(2);
}

const since = Date.parse(sinceArg);
const entries = (JSON.parse(readFileSync(prsPath, "utf8")) as PullRequest[])
  .filter((pr) => Date.parse(pr.mergedAt) >= since)
  .sort((a, b) => Date.parse(a.mergedAt) - Date.parse(b.mergedAt))
  .map((pr) => ({ pr, attribution: attribute(pr) }));

process.stdout.write(`${[
  "# AI audit trail",
  "",
  `Pull requests merged into \`main\` from ${sinceArg} to now.`,
  "",
  ...sourceSection(entries),
  "",
  ...mergerSection(entries),
  "",
  ...ledgerSection(entries),
].join("\n")}\n`);
