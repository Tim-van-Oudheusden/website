#!/usr/bin/env bun
// Summarise where the project is heading as a Markdown strategy report: issue
// and PR flow over a window, the open backlog per pipeline stage (stage/*
// labels), and ACMM maturity gaps per level.
//
// Usage:
//   bun scripts/strategy-report.ts <since YYYY-MM-DD> <issues.json> <prs.json>
//
// <issues.json> is `gh issue list --state all --json
// number,title,state,labels,createdAt,closedAt`; <prs.json> is `gh pr list
// --state merged --json mergedAt`. The window runs from <since> (UTC midnight)
// to now. Exits 1 if an input can't be read, 2 on bad usage.
import { readFileSync } from "node:fs";

interface Issue {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: { name: string }[];
  createdAt: string;
  closedAt: string | null;
}

interface PullRequest {
  mergedAt: string;
}

function inWindow(timestamp: string | null, since: number): boolean {
  return timestamp !== null && Date.parse(timestamp) >= since;
}

function flowSection(issues: Issue[], prs: PullRequest[], since: number): string[] {
  const opened = issues.filter((issue) => inWindow(issue.createdAt, since)).length;
  const closed = issues.filter((issue) => inWindow(issue.closedAt, since)).length;
  const merged = prs.filter((pr) => inWindow(pr.mergedAt, since)).length;
  const open = issues.filter((issue) => issue.state === "OPEN").length;
  const net = opened - closed;

  return [
    "## Flow",
    "",
    "| Measure | Count |",
    "| --- | ---: |",
    `| Issues opened | ${opened} |`,
    `| Issues closed | ${closed} |`,
    `| Net backlog change | ${net > 0 ? `+${net}` : String(net)} |`,
    `| PRs merged | ${merged} |`,
    `| Open issues now | ${open} |`,
  ];
}

function backlogSection(issues: Issue[]): string[] {
  const counts = new Map<string, number>();
  let unstaged = 0;

  for (const issue of issues.filter(({ state }) => state === "OPEN")) {
    const stages = issue.labels.map(({ name }) => name).filter((name) => name.startsWith("stage/"));

    if (stages.length === 0) {
      unstaged += 1;
    }

    for (const stage of stages) {
      counts.set(stage, (counts.get(stage) ?? 0) + 1);
    }
  }

  // Stage labels carry a numeric prefix (stage/010-actionable), so name order is pipeline order.
  const rows = [...counts].sort(([a], [b]) => a.localeCompare(b)).map(([stage, count]) => `| ${stage} | ${count} |`);

  return [
    "## Backlog by stage",
    "",
    "| Stage | Open issues |",
    "| --- | ---: |",
    ...rows,
    `| No stage | ${unstaged} |`,
  ];
}

// The Hive ACMM evaluation files one `acmm` issue per missing criterion, titled
// "[ACMM L<level>] Add <criterion>", and the PR that fills the gap closes it.
const ACMM_TITLE = /^\[ACMM L(\d+)\] (?:Add )?(.+)$/;

function acmmSection(issues: Issue[]): string[] {
  const levels = new Map<number, { closed: number; open: string[] }>();

  for (const issue of issues) {
    const match = ACMM_TITLE.exec(issue.title);

    if (match === null || !issue.labels.some(({ name }) => name === "acmm")) {
      continue;
    }

    const level = Number(match[1]);
    const tally = levels.get(level) ?? { closed: 0, open: [] };

    if (issue.state === "OPEN") {
      tally.open.push(`#${issue.number} ${match[2]}`);
    } else {
      tally.closed += 1;
    }

    levels.set(level, tally);
  }

  const rows = [...levels]
    .sort(([a], [b]) => a - b)
    .map(([level, { closed, open }]) => `| L${level} | ${closed} | ${open.length} | ${open.join(", ") || "—"} |`);

  return [
    "## ACMM progress",
    "",
    "| Level | Closed gaps | Open gaps | Still open |",
    "| --- | ---: | ---: | --- |",
    ...rows,
  ];
}

const [sinceArg, issuesPath, prsPath] = process.argv.slice(2);

if (sinceArg === undefined || issuesPath === undefined || prsPath === undefined) {
  console.error("usage: bun scripts/strategy-report.ts <since YYYY-MM-DD> <issues.json> <prs.json>");
  process.exit(2);
}

const issues = JSON.parse(readFileSync(issuesPath, "utf8")) as Issue[];
const prs = JSON.parse(readFileSync(prsPath, "utf8")) as PullRequest[];
const since = Date.parse(sinceArg);

process.stdout.write(`${[
  "# Strategy report",
  "",
  `Window: ${sinceArg} to now.`,
  "",
  ...flowSection(issues, prs, since),
  "",
  ...backlogSection(issues),
  "",
  ...acmmSection(issues),
].join("\n")}\n`);
