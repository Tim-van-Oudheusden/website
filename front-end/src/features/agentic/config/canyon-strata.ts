/** A repository file or folder that backs a stratum's claims. */
export interface CanyonSourceLink {
  label: string;
  href: string;
}

/** One layer of the canyon: what the site is built on at that depth. */
export interface CanyonStratum {
  /** Slug for deep links: `/agentic#<id>`. */
  id: string;
  heading: string;
  sentence: string;
  /** The concrete tools or files the layer reveals. */
  pillars: readonly string[];
  sourceLinks: readonly CanyonSourceLink[];
  /** An in-page link onward from the card (the bedrock hands off to the live metrics below the canyon), or null. */
  handOff: CanyonSourceLink | null;
}

const REPO_URL = "https://github.com/Tim-van-Oudheusden/website";

function repoFile(path: string): CanyonSourceLink {
  return { label: path, href: `${REPO_URL}/blob/main/${path}` };
}

function repoFolder(path: string): CanyonSourceLink {
  return { label: `${path}/`, href: `${REPO_URL}/tree/main/${path}` };
}

/** The six strata, rim to bedrock. The order is the reveal order. */
export const CANYON_STRATA: readonly CanyonStratum[] = [
  {
    id: "content",
    heading: "Content",
    sentence: "I write the articles and project pages as Markdown in Obsidian, and the back-end serves them from the content/ folder.",
    pillars: ["Markdown written in Obsidian", "The content/ folder", "The Obsidian content pipeline"],
    sourceLinks: [repoFolder("content"), repoFile("docs/content-authoring.md")],
    handOff: null,
  },
  {
    id: "interface",
    heading: "Interface",
    sentence: "The pages you see are React components, built with Vite and styled with Tailwind CSS and shadcn components.",
    pillars: ["React 19", "Vite", "Tailwind CSS v4", "shadcn components on Radix"],
    sourceLinks: [repoFile("front-end/package.json")],
    handOff: null,
  },
  {
    id: "api",
    heading: "API",
    sentence: "A Fastify server serves the content and counts article views in SQLite; front-end and back-end share their types.",
    pillars: ["Fastify", "Shared contracts in shared/", "SQLite view counts"],
    sourceLinks: [
      repoFile("back-end/src/app.ts"),
      repoFile("shared/src/index.ts"),
      repoFile("back-end/src/features/views/view-store.ts"),
    ],
    handOff: null,
  },
  {
    id: "quality",
    heading: "Quality",
    sentence: "Every code change starts with a failing test, and the same checks run on every pull request, whether an agent or I wrote it.",
    pillars: [
      "Test-driven development with bun:test",
      "Playwright end-to-end tests",
      "Stryker mutation testing",
      "Coverage floors that only ratchet up",
    ],
    sourceLinks: [repoFile("docs/testing.md"), repoFile("docs/metrics/README.md")],
    handOff: null,
  },
  {
    id: "delivery",
    heading: "Delivery",
    sentence: "Once the checks pass, the merge queue merges the change, CI publishes new images, and my server checks for them every five minutes.",
    pillars: [
      "GitHub Actions",
      "The merge queue",
      "Images on GHCR",
      "podman kube play with an update timer and automatic rollback",
      "Cloudflare Tunnel",
    ],
    sourceLinks: [repoFolder(".github/workflows"), repoFile("docs/deploy.md"), repoFolder("deploy")],
    handOff: null,
  },
  {
    id: "agents-hive",
    heading: "Agents · Hive",
    sentence: "Several agents change this repository at the same time; GitHub issues and labels say who is working on what.",
    pillars: [
      "Hive's agents: scanner, architect, quality, craftsman and strategist",
      "Claude Code in CI",
      "Dependabot",
      "Coordinated through GitHub issues",
    ],
    sourceLinks: [repoFile("docs/multi-agent.md"), repoFile(".github/workflows/claude.yml")],
    handOff: { label: "This layer is live", href: "#metrics" },
  },
];
