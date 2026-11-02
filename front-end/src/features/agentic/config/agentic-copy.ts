/** The words every Agentic design shows, so the designs differ in look only, never in what they say. */

const REPO_URL = "https://github.com/Tim-van-Oudheusden/website";

export interface CopyLink {
  label: string;
  href: string;
}

export const AGENTIC_COPY = {
  title: "Agentic",
  intro: "I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the same "
    + "checks and review as mine. This page shows how that works.",
  /** How a change gets from an issue to the live site, in order. */
  flow: [
    { step: "Issue", text: "Work starts as a GitHub issue; its labels and assignee say who is working on it." },
    { step: "Agent", text: "A Hive agent, Claude Code in CI or I claim the issue and work on a branch." },
    { step: "Pull request", text: "Every code change starts with a failing test and lands as a pull request." },
    { step: "Checks", text: "The same checks run on every pull request, whoever wrote it." },
    { step: "Merge & deploy", text: "The merge queue merges it, and my server picks up the new images within five minutes." },
  ],
  hiveHeading: "The hive, live",
  hiveIntro: "Hive is the agent system that files, claims and lands work in this repo. These numbers come from the "
    + "instance running on this server and from this repo's public pull requests.",
  /** One line in place of a part whose upstream is missing. */
  missing: {
    hive: "Live queue data is not connected right now.",
    contributors: "Contributor agent data is not available right now.",
    repo: "Pull request data for this repo is not available right now.",
  },
  /** What each chart counts and where its numbers come from. */
  notes: {
    queue: "One point per governor evaluation, about every 5 minutes.",
    mode: "The governor rises with the size of the queue: idle, quiet, busy, surge.",
    contributors: "Tasks done by contributor agents connected to this hive.",
    runs: "Percentiles are per backend; they are never added up or averaged across backends.",
    repo: "From public GitHub data for Tim-van-Oudheusden/website.",
    attribution: "Split by author, not by who merged: a PR is Hive's when its body ends with Hive's signature line, "
      + "then a claude/ branch counts as Claude Code in CI and a dependabot/ branch as Dependabot.",
  },
  privacy: "Repository names, agent names, cost and logs are deliberately not published.",
} as const;

export const AGENTIC_LINKS = {
  hive: { label: "hivecommons/hive", href: "https://github.com/hivecommons/hive" },
  multiAgent: { label: "docs/multi-agent.md", href: `${REPO_URL}/blob/main/docs/multi-agent.md` },
  attribution: { label: "How PRs are attributed", href: `${REPO_URL}/blob/main/docs/metrics/README.md` },
} as const satisfies Record<string, CopyLink>;
