// Who wrote a pull request: the one rule the AI audit trail
// (scripts/ai-audit-report.ts) and the PR acceptance metric
// (scripts/pr-metrics.ts) both classify PRs by, so the two reports agree.

export const SOURCES = ["Hive", "Claude Code (CI)", "Dependabot", "Other"] as const;

export interface Attribution {
  source: (typeof SOURCES)[number];
  agent: string;
  model: string;
}

// Hive's signature is a line of its own, usually near the end of the body but
// not always last, so match any line. It reads like
// "— hive: agent=quality backend=claude model=claude-opus-5-5 effort=high";
// contributor runs leave out `agent=`.
const HIVE_SIGNATURE = /^— hive: (.*)$/m;

export function attribute(pr: { headRefName: string; body: string }): Attribution {
  const signature = HIVE_SIGNATURE.exec(pr.body)?.[1];

  if (signature !== undefined) {
    // Split on whitespace rather than matching /(\w+)=(\S+)/g: that regex
    // backtracks quadratically on a long word with no "=" (CodeQL js/polynomial-redos).
    const fields = new Map(
      signature.split(/\s+/).flatMap((token) => {
        const separator = token.indexOf("=");

        return separator > 0 ? [[token.slice(0, separator), token.slice(separator + 1)] as const] : [];
      }),
    );

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
