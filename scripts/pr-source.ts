// Who wrote a pull request: the one rule the AI audit trail
// (scripts/ai-audit-report.ts) and the PR acceptance metric
// (scripts/pr-metrics.ts) both classify PRs by, so the two reports agree.

export const SOURCES = ["Hive", "Claude Code (CI)", "Dependabot", "Other"] as const;

export interface Attribution {
  source: (typeof SOURCES)[number];
  agent: string;
  model: string;
}

// Hive ends every PR body it writes with a signature line such as
// "— hive: agent=quality backend=claude model=claude-opus-5-5 effort=high";
// contributor runs leave out `agent=`.
const HIVE_SIGNATURE = /^— hive: (.*)$/m;

export function attribute(pr: { headRefName: string; body: string }): Attribution {
  const signature = HIVE_SIGNATURE.exec(pr.body)?.[1];

  if (signature !== undefined) {
    const fields = new Map([...signature.matchAll(/(\w+)=(\S+)/g)].map(([, key, value]) => [key, value]));

    return { source: "Hive", agent: fields.get("agent") ?? "—", model: fields.get("model") ?? "—" };
  }

  // Branch prefixes as docs/multi-agent.md assigns them.
  if (pr.headRefName.startsWith("claude/")) {
    return { source: "Claude Code (CI)", agent: "—", model: "—" };
  }

  if (pr.headRefName.startsWith("dependabot/")) {
    return { source: "Dependabot", agent: "—", model: "—" };
  }

  return { source: "Other", agent: "—", model: "—" };
}
