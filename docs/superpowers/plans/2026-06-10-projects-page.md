# Projects Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a credibility-focused, image-led Projects page with featured editorial cards, starter project content, expanded project metadata, and markdown-first project detail pages.

**Architecture:** Keep the existing content API and React routes. Expand the shared project frontmatter contract, normalize project-only metadata in the backend, add starter markdown and SVG artwork, then render the data with small front-end helpers and exported layout constants for testability.

**Tech Stack:** Bun, TypeScript, Fastify, React 19, React Router 7, Tailwind CSS v4, shadCN UI primitives, `react-markdown`.

---

## File Structure

- Modify `shared/src/index.ts`: add project metadata constants and interfaces used by backend and frontend.
- Modify `shared/src/content.test.ts`: assert project metadata constants and a full `ProjectFrontmatter` sample.
- Modify `back-end/src/features/content/content.ts`: normalize project-only frontmatter fields and preserve article behavior.
- Modify `back-end/src/features/content/content.test.ts`: add project metadata normalization coverage and update project fixtures to include required cover fields.
- Modify `back-end/src/features/content/content-routes.test.ts`: ensure project route fixtures include cover metadata and verify route output includes it.
- Create `content/Personal Website Platform.md`: starter project content for this site.
- Create `content/Obsidian Content Pipeline.md`: starter project content for the markdown/content workflow.
- Create `content/Pi Sandbox Automation.md`: starter project content for the sandbox automation work in this repo.
- Create `public/images/projects/personal-website-platform.svg`: Adwaita editorial artwork.
- Create `public/images/projects/obsidian-content-pipeline.svg`: Adwaita editorial artwork.
- Create `public/images/projects/pi-sandbox-automation.svg`: Adwaita editorial artwork.
- Create `front-end/src/features/projects/project-display.ts`: pure helpers for sorting and splitting featured/gallery projects.
- Create `front-end/src/features/projects/project-display.test.ts`: helper tests.
- Modify `front-end/src/features/projects/pages/ProjectsPage.tsx`: render hero, featured card, gallery, states, and exported card component/constants.
- Create `front-end/src/features/projects/pages/ProjectsPage.layout.test.ts`: render/class tests for the landing page pieces.
- Modify `front-end/src/features/projects/pages/ProjectPage.tsx`: render markdown-first project detail header and guard non-project content.
- Create `front-end/src/features/projects/pages/ProjectPage.layout.test.ts`: render/class/type-guard tests for detail page pieces.

## Task 1: Expand Project Metadata Contract And Backend Normalization

**Files:**
- Modify: `shared/src/index.ts`
- Modify: `shared/src/content.test.ts`
- Modify: `back-end/src/features/content/content.ts`
- Modify: `back-end/src/features/content/content.test.ts`
- Modify: `back-end/src/features/content/content-routes.test.ts`

- [ ] **Step 1: Write the failing shared metadata tests**

Add these imports in `shared/src/content.test.ts`:

```ts
import {
  CONTENT_TYPES,
  PROJECT_LINK_TYPES,
  PROJECT_STATUSES,
} from "./index";
import type {
  ContentFrontmatter,
  ContentType,
  ProjectFrontmatter,
  ProjectLink,
} from "./index";
```

Add these tests inside `describe("content frontmatter schema", () => { ... })`:

```ts
  test("PROJECT_STATUSES defines the supported project lifecycle labels", () => {
    expect(PROJECT_STATUSES).toEqual(["Planned", "In Progress", "Shipped", "Archived"]);
  });

  test("PROJECT_LINK_TYPES defines the supported secondary project link types", () => {
    expect(PROJECT_LINK_TYPES).toEqual(["demo", "repo", "docs", "article", "external"]);
  });

  test("a valid ProjectFrontmatter object includes project metadata", () => {
    const links: ProjectLink[] = [
      { type: "repo", label: "Source", href: "https://example.com/repo" },
      { type: "demo", label: "Live Demo", href: "https://example.com/demo" },
    ];

    const project: ProjectFrontmatter = {
      title: "Personal Website Platform",
      description: "A full-stack personal website with markdown content.",
      date: "2026-06-10T00:00:00Z",
      tags: ["React", "Fastify", "Tailwind"],
      type: "project",
      draft: false,
      slug: "personal-website-platform",
      coverImage: "/images/projects/personal-website-platform.svg",
      coverImageAlt: "Abstract Adwaita editorial artwork showing a website layout and content cards.",
      featured: true,
      projectOrder: 10,
      status: "Shipped",
      role: "Full-stack developer",
      timeframe: "2026",
      links,
      outcome: "Created a maintainable home for articles, projects, and experiments.",
    };

    expect(project.coverImage).toBe("/images/projects/personal-website-platform.svg");
    expect(project.coverImageAlt).toContain("website layout");
    expect(project.featured).toBe(true);
    expect(project.projectOrder).toBe(10);
    expect(project.status).toBe("Shipped");
    expect(project.role).toBe("Full-stack developer");
    expect(project.timeframe).toBe("2026");
    expect(project.links).toEqual(links);
    expect(project.outcome).toContain("maintainable home");
  });
```

- [ ] **Step 2: Run the shared test and confirm it fails**

Run: `bun test shared/src/content.test.ts`

Expected: FAIL because `PROJECT_LINK_TYPES`, `PROJECT_STATUSES`, `ProjectFrontmatter`, and `ProjectLink` are not defined with the new contract.

- [ ] **Step 3: Add the shared project metadata contract**

In `shared/src/index.ts`, add these constants after `CONTENT_TYPES`:

```ts
export const PROJECT_STATUSES = ["Planned", "In Progress", "Shipped", "Archived"] as const;
export const PROJECT_LINK_TYPES = ["demo", "repo", "docs", "article", "external"] as const;
```

Add these union types near the other shared content types:

```ts
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ProjectLinkType = (typeof PROJECT_LINK_TYPES)[number];
```

Add this interface before `ProjectFrontmatter`:

```ts
export interface ProjectLink {
  type: ProjectLinkType;
  label: string;
  href: string;
}
```

Replace `ProjectFrontmatter` with:

```ts
export interface ProjectFrontmatter extends BaseContentFrontmatter {
  type: "project";
  coverImage: string;
  coverImageAlt: string;
  featured: boolean;
  projectOrder: number;
  status?: ProjectStatus | undefined;
  role?: string | undefined;
  timeframe?: string | undefined;
  links: ProjectLink[];
  outcome?: string | undefined;
}
```

Update the existing `slug is optional and can be set` test project object so it includes the new required project fields:

```ts
      coverImage: "/images/projects/custom-slug.svg",
      coverImageAlt: "Abstract project artwork.",
      featured: false,
      projectOrder: 0,
      links: [],
```

- [ ] **Step 4: Run the shared test and confirm it passes**

Run: `bun test shared/src/content.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing backend normalization tests**

In `back-end/src/features/content/content.test.ts`, add a helper after `articleMarkdown`:

```ts
function projectMarkdown(
  overrides: Partial<{
    title: string;
    description: string;
    date: string;
    slug: string;
    tags: string[];
    body: string;
    draft: boolean;
    coverImage: string;
    coverImageAlt: string;
    featured: boolean;
    projectOrder: number;
    status: string;
    role: string;
    timeframe: string;
    links: Array<{ type: string; label: string; href: string }>;
    outcome: string;
  }> = {},
): string {
  const title = overrides.title ?? "Sample Project";
  const description = overrides.description ?? "Sample project description";
  const date = overrides.date ?? "2026-02-08T12:00:00Z";
  const slug = overrides.slug ?? "sample-project";
  const tags = overrides.tags ?? ["sample", "project"];
  const body = overrides.body ?? "# Sample Project\n\nProject body";
  const draft = overrides.draft ?? false;
  const coverImage = overrides.coverImage ?? "/images/projects/sample-project.svg";
  const coverImageAlt = overrides.coverImageAlt ?? "Abstract project artwork.";
  const featured = overrides.featured ?? false;
  const projectOrder = overrides.projectOrder ?? 0;
  const status = overrides.status ?? "Shipped";
  const role = overrides.role ?? "Developer";
  const timeframe = overrides.timeframe ?? "2026";
  const links = overrides.links ?? [
    { type: "repo", label: "Source", href: "https://example.com/repo" },
  ];
  const outcome = overrides.outcome ?? "Demonstrates the project metadata contract.";

  return [
    "---",
    `title: ${title}`,
    `description: ${description}`,
    `date: ${date}`,
    "tags:",
    ...tags.map((tag) => `  - ${tag}`),
    "type: project",
    `draft: ${draft}`,
    `slug: ${slug}`,
    `coverImage: ${coverImage}`,
    `coverImageAlt: ${coverImageAlt}`,
    `featured: ${featured}`,
    `projectOrder: ${projectOrder}`,
    `status: ${status}`,
    `role: ${role}`,
    `timeframe: ${timeframe}`,
    "links:",
    ...links.flatMap((link) => [
      `  - type: ${link.type}`,
      `    label: ${link.label}`,
      `    href: ${link.href}`,
    ]),
    `outcome: ${outcome}`,
    "---",
    "",
    body,
  ].join("\n");
}
```

Update existing calls that create `type: "project"` content to use `projectMarkdown()` instead of `articleMarkdown({ type: "project" })`.

Add these tests:

```ts
  test("listContent normalizes project metadata", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "sample-project.md"),
        projectMarkdown({ featured: true, projectOrder: 20 }),
      );

      const projects = await listContent(tempContentDir, { type: "project" });
      expect(projects).toHaveLength(1);
      expect(projects[0]).toMatchObject({
        title: "Sample Project",
        type: "project",
        coverImage: "/images/projects/sample-project.svg",
        coverImageAlt: "Abstract project artwork.",
        featured: true,
        projectOrder: 20,
        status: "Shipped",
        role: "Developer",
        timeframe: "2026",
        outcome: "Demonstrates the project metadata contract.",
      });
      expect(projects[0]).toHaveProperty("links", [
        { type: "repo", label: "Source", href: "https://example.com/repo" },
      ]);
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("getContentBySlug returns project metadata with body", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "sample-project.md"),
        projectMarkdown({ body: "# Sample Project\n\n## Outcome\n\nResult text" }),
      );

      const project = await getContentBySlug("sample-project", tempContentDir);
      expect(project).not.toBeNull();
      if (project === null) {
        throw new Error("Expected sample-project content item");
      }
      expect(project.type).toBe("project");
      expect(project.coverImage).toBe("/images/projects/sample-project.svg");
      expect(project.links).toEqual([
        { type: "repo", label: "Source", href: "https://example.com/repo" },
      ]);
      expect(project.body).toContain("## Outcome");
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });

  test("listContent fails when a project is missing cover artwork metadata", async () => {
    const tempContentDir = await mkdtemp(resolve(tmpdir(), "website-content-"));

    try {
      await writeFile(
        resolve(tempContentDir, "missing-project-cover.md"),
        [
          "---",
          "title: Missing Project Cover",
          "date: 2026-02-08T12:00:00Z",
          "type: project",
          "draft: false",
          "slug: missing-project-cover",
          "---",
          "",
          "# Missing Project Cover",
        ].join("\n"),
      );

      let didThrow = false;
      try {
        await listContent(tempContentDir, { type: "project" });
      } catch {
        didThrow = true;
      }
      expect(didThrow).toBe(true);
    } finally {
      await rm(tempContentDir, { recursive: true, force: true });
    }
  });
```

- [ ] **Step 6: Run the backend content test and confirm it fails**

Run: `bun test back-end/src/features/content/content.test.ts`

Expected: FAIL because project metadata is not normalized yet and project cover metadata is not validated.

- [ ] **Step 7: Implement backend project metadata normalization**

Update imports in `back-end/src/features/content/content.ts`:

```ts
import { ARTICLE_CATEGORIES, PROJECT_LINK_TYPES, PROJECT_STATUSES } from "shared";
import type { ArticleCategory, ContentFrontmatter, ContentType, ProjectLink, ProjectStatus } from "shared";
```

Add helper functions near `normalizeDate`:

```ts
function normalizeString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") {
    return value;
  }

  return undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
}

function normalizeNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return fallback;
}

function normalizeProjectStatus(value: unknown): ProjectStatus | undefined {
  if (typeof value === "string" && (PROJECT_STATUSES as readonly string[]).includes(value)) {
    return value as ProjectStatus;
  }

  return undefined;
}

function normalizeProjectLinks(value: unknown): ProjectLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item): ProjectLink[] => {
    if (typeof item !== "object" || item === null) {
      return [];
    }

    const rawLink = item as Record<string, unknown>;
    const type = rawLink["type"];
    const label = normalizeString(rawLink["label"]);
    const href = normalizeString(rawLink["href"]);

    if (
      typeof type !== "string"
      || !(PROJECT_LINK_TYPES as readonly string[]).includes(type)
      || label === undefined
      || href === undefined
    ) {
      return [];
    }

    return [{ type: type as ProjectLink["type"], label, href }];
  });
}
```

Replace the project return block in `normalizeFrontmatter` with:

```ts
  const coverImage = normalizeString(raw["coverImage"]);
  const coverImageAlt = normalizeString(raw["coverImageAlt"]);
  if (coverImage === undefined || coverImageAlt === undefined) {
    throw new Error(`Project "${file}" is missing coverImage or coverImageAlt`);
  }

  return {
    title,
    description,
    date,
    tags,
    type,
    draft,
    slug,
    coverImage,
    coverImageAlt,
    featured: normalizeBoolean(raw["featured"], false),
    projectOrder: normalizeNumber(raw["projectOrder"], 0),
    status: normalizeProjectStatus(raw["status"]),
    role: normalizeString(raw["role"]),
    timeframe: normalizeString(raw["timeframe"]),
    links: normalizeProjectLinks(raw["links"]),
    outcome: normalizeString(raw["outcome"]),
  };
```

- [ ] **Step 8: Update the content route project fixture and route assertion**

In `back-end/src/features/content/content-routes.test.ts`, add these lines to the project markdown frontmatter before `---`:

```ts
        "coverImage: /images/projects/route-test-project.svg",
        "coverImageAlt: Abstract route test project artwork.",
        "featured: true",
        "projectOrder: 5",
        "status: Shipped",
        "role: Test developer",
        "timeframe: 2026",
        "links:",
        "  - type: repo",
        "    label: Source",
        "    href: https://example.com/route-test-project",
        "outcome: Route output includes project metadata.",
```

Add these expectations to `GET /content?type=project returns only projects`:

```ts
    expect(body[0]).toHaveProperty("coverImage", "/images/projects/route-test-project.svg");
    expect(body[0]).toHaveProperty("coverImageAlt", "Abstract route test project artwork.");
    expect(body[0]).toHaveProperty("featured", true);
    expect(body[0]).toHaveProperty("projectOrder", 5);
    expect(body[0]).toHaveProperty("status", "Shipped");
    expect(body[0]).toHaveProperty("role", "Test developer");
    expect(body[0]).toHaveProperty("timeframe", "2026");
    expect(body[0]).toHaveProperty("links", [
      { type: "repo", label: "Source", href: "https://example.com/route-test-project" },
    ]);
    expect(body[0]).toHaveProperty("outcome", "Route output includes project metadata.");
```

- [ ] **Step 9: Run focused tests and full suite**

Run: `bun test shared/src/content.test.ts back-end/src/features/content/content.test.ts back-end/src/features/content/content-routes.test.ts`

Expected: PASS.

Run: `bun test`

Expected: PASS.

- [ ] **Step 10: Commit Task 1**

```bash
git add shared/src/index.ts shared/src/content.test.ts back-end/src/features/content/content.ts back-end/src/features/content/content.test.ts back-end/src/features/content/content-routes.test.ts
git commit -m "feat(content): add project metadata contract"
```

## Task 2: Add Starter Project Content And Adwaita Editorial Artwork

**Files:**
- Create: `content/Personal Website Platform.md`
- Create: `content/Obsidian Content Pipeline.md`
- Create: `content/Pi Sandbox Automation.md`
- Create: `public/images/projects/personal-website-platform.svg`
- Create: `public/images/projects/obsidian-content-pipeline.svg`
- Create: `public/images/projects/pi-sandbox-automation.svg`

- [ ] **Step 1: Create the project artwork directory**

Run: `mkdir -p public/images/projects`

Expected: directory exists at `public/images/projects`.

- [ ] **Step 2: Add the personal website artwork SVG**

Create `public/images/projects/personal-website-platform.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
  <title id="title">Personal website platform artwork</title>
  <desc id="desc">Abstract Adwaita editorial illustration with a browser window, content cards, and blue-green accent shapes.</desc>
  <rect width="1200" height="800" rx="72" fill="#f3efe5"/>
  <circle cx="220" cy="190" r="120" fill="#3584e4"/>
  <circle cx="980" cy="650" r="150" fill="#2190a4"/>
  <rect x="210" y="170" width="780" height="460" rx="42" fill="#ffffff" stroke="#deddda" stroke-width="6"/>
  <rect x="210" y="170" width="780" height="72" rx="42" fill="#f6f5f4"/>
  <circle cx="262" cy="206" r="13" fill="#e62d42"/>
  <circle cx="304" cy="206" r="13" fill="#c88800"/>
  <circle cx="346" cy="206" r="13" fill="#3a944a"/>
  <rect x="288" y="304" width="250" height="210" rx="28" fill="#3584e4"/>
  <rect x="588" y="304" width="260" height="74" rx="22" fill="#241f31"/>
  <rect x="588" y="414" width="300" height="28" rx="14" fill="#9a9996"/>
  <rect x="588" y="468" width="230" height="28" rx="14" fill="#c0bfbc"/>
  <path d="M338 464c64-108 109-145 162-145 63 0 101 53 101 145z" fill="#81d0ff" opacity="0.95"/>
</svg>
```

- [ ] **Step 3: Add the Obsidian content pipeline artwork SVG**

Create `public/images/projects/obsidian-content-pipeline.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
  <title id="title">Obsidian content pipeline artwork</title>
  <desc id="desc">Abstract Adwaita editorial illustration with markdown documents flowing into organized content cards.</desc>
  <rect width="1200" height="800" rx="72" fill="#f3efe5"/>
  <circle cx="230" cy="610" r="145" fill="#9141ac"/>
  <circle cx="1000" cy="190" r="120" fill="#d56199"/>
  <rect x="190" y="150" width="300" height="430" rx="34" fill="#ffffff" stroke="#deddda" stroke-width="6"/>
  <rect x="260" y="240" width="160" height="24" rx="12" fill="#241f31"/>
  <rect x="250" y="310" width="180" height="18" rx="9" fill="#9a9996"/>
  <rect x="250" y="360" width="140" height="18" rx="9" fill="#c0bfbc"/>
  <path d="M530 370h140" stroke="#3584e4" stroke-width="26" stroke-linecap="round"/>
  <path d="M650 330l62 40-62 40z" fill="#3584e4"/>
  <rect x="730" y="190" width="300" height="390" rx="38" fill="#ffffff" stroke="#deddda" stroke-width="6"/>
  <rect x="790" y="260" width="180" height="78" rx="24" fill="#2190a4"/>
  <rect x="790" y="382" width="180" height="22" rx="11" fill="#241f31"/>
  <rect x="790" y="438" width="132" height="22" rx="11" fill="#9a9996"/>
  <path d="M210 612c120-80 220-80 338 0" stroke="#ffc252" stroke-width="24" stroke-linecap="round" fill="none"/>
</svg>
```

- [ ] **Step 4: Add the Pi sandbox automation artwork SVG**

Create `public/images/projects/pi-sandbox-automation.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc">
  <title id="title">Pi sandbox automation artwork</title>
  <desc id="desc">Abstract Adwaita editorial illustration with a small computer board, automation path, and container blocks.</desc>
  <rect width="1200" height="800" rx="72" fill="#f3efe5"/>
  <circle cx="220" cy="220" r="130" fill="#3a944a"/>
  <circle cx="960" cy="610" r="150" fill="#ed5b00"/>
  <rect x="265" y="210" width="430" height="330" rx="44" fill="#ffffff" stroke="#deddda" stroke-width="6"/>
  <rect x="338" y="285" width="110" height="110" rx="24" fill="#241f31"/>
  <circle cx="560" cy="340" r="44" fill="#3584e4"/>
  <circle cx="600" cy="450" r="22" fill="#c88800"/>
  <circle cx="514" cy="450" r="22" fill="#2190a4"/>
  <path d="M700 376c130 0 160-120 280-120" stroke="#3584e4" stroke-width="24" stroke-linecap="round" fill="none"/>
  <rect x="832" y="198" width="170" height="120" rx="30" fill="#ffffff" stroke="#deddda" stroke-width="6"/>
  <rect x="870" y="238" width="94" height="18" rx="9" fill="#241f31"/>
  <rect x="870" y="278" width="64" height="18" rx="9" fill="#9a9996"/>
  <path d="M330 566c80 58 190 58 270 0" stroke="#26a269" stroke-width="22" stroke-linecap="round" fill="none"/>
</svg>
```

- [ ] **Step 5: Add starter project markdown files**

Create `content/Personal Website Platform.md`:

```md
---
title: Personal Website Platform
description: A full-stack personal website for articles, projects, and long-form markdown content.
date: 2026-06-10
tags:
  - React
  - Fastify
  - Tailwind CSS
  - Content
type: project
draft: false
slug: personal-website-platform
coverImage: /images/projects/personal-website-platform.svg
coverImageAlt: Abstract Adwaita editorial artwork showing a browser window, content cards, and blue-green accent shapes.
featured: true
projectOrder: 10
status: Shipped
role: Full-stack developer
timeframe: 2026
links:
  - type: repo
    label: Source repository
    href: https://github.com/Tim-van-Oudheusden/website
outcome: Built a maintainable home for articles, projects, and experiments with shared route and content contracts.
---

# Personal Website Platform

This project is the full-stack platform behind this website. It combines a React front end, a Fastify back end, and a shared TypeScript package so routes, content types, and API contracts stay aligned.

## Problem

I wanted a personal site that could grow from a homepage and articles into a broader system for projects, recommendations, and experiments without turning every page into a one-off implementation.

## Approach

The implementation keeps content in markdown, exposes it through a small content API, and renders it with reusable page components and shared design tokens.

## Outcome

The site now has a clearer foundation for publishing long-form articles and credibility-focused project pages from the same content pipeline.
```

Create `content/Obsidian Content Pipeline.md`:

```md
---
title: Obsidian Content Pipeline
description: A markdown workflow that turns Obsidian-authored notes into website content with frontmatter and image handling.
date: 2026-06-10
tags:
  - Obsidian
  - Markdown
  - Content API
  - Automation
type: project
draft: false
slug: obsidian-content-pipeline
coverImage: /images/projects/obsidian-content-pipeline.svg
coverImageAlt: Abstract Adwaita editorial artwork showing markdown documents flowing into organized content cards.
featured: false
projectOrder: 20
status: Shipped
role: Developer and content author
timeframe: 2026
links:
  - type: article
    label: Notes article
    href: /articles/making-my-work-easier-with-notes-in-obsidian
outcome: Made markdown authoring predictable enough to support articles and project case studies from one content folder.
---

# Obsidian Content Pipeline

This project connects my note-taking workflow to the website. Markdown files live in `content/`, use frontmatter for structured metadata, and can reference images served through the back-end content asset route.

## Problem

Writing in a separate CMS would create friction. I wanted the website to accept content from the same markdown workflow I already use for thinking and drafting.

## Approach

The pipeline normalizes frontmatter, filters drafts in production, rewrites Obsidian image embeds, and renders markdown with consistent typography on the front end.

## Outcome

The website can publish article and project content without duplicating authoring workflows or introducing a separate content system.
```

Create `content/Pi Sandbox Automation.md`:

```md
---
title: Pi Sandbox Automation
description: Automation for running and testing sandboxed workloads with reproducible container and compose configuration.
date: 2026-06-10
tags:
  - Automation
  - Containers
  - Testing
  - Linux
type: project
draft: false
slug: pi-sandbox-automation
coverImage: /images/projects/pi-sandbox-automation.svg
coverImageAlt: Abstract Adwaita editorial artwork showing a small computer board, automation path, and container blocks.
featured: false
projectOrder: 30
status: Shipped
role: Developer
timeframe: 2026
links:
  - type: repo
    label: Repository scripts
    href: https://github.com/Tim-van-Oudheusden/website
outcome: Captured sandbox assumptions in scripts and tests so local automation remains easier to inspect and maintain.
---

# Pi Sandbox Automation

This project captures the automation around local sandbox execution. The repository includes scripts and tests for sandbox setup, compose files, and supporting container configuration.

## Problem

Local automation becomes fragile when setup knowledge only lives in memory. The sandbox work needed repeatable commands and tests that document expected behavior.

## Approach

The project keeps scripts and configuration in the repository, then uses tests to verify important generated files and route assumptions.

## Outcome

The automation is easier to review, easier to rerun, and less dependent on manual setup notes.
```

- [ ] **Step 6: Verify content is parseable**

Run: `bun test back-end/src/features/content/content.test.ts back-end/src/features/content/content-routes.test.ts`

Expected: PASS.

Run: `bun test`

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
git add content/Personal\ Website\ Platform.md content/Obsidian\ Content\ Pipeline.md content/Pi\ Sandbox\ Automation.md public/images/projects/personal-website-platform.svg public/images/projects/obsidian-content-pipeline.svg public/images/projects/pi-sandbox-automation.svg
git commit -m "feat(projects): add starter project content"
```

## Task 3: Add Project Display Helpers

**Files:**
- Create: `front-end/src/features/projects/project-display.ts`
- Create: `front-end/src/features/projects/project-display.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `front-end/src/features/projects/project-display.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import type { ProjectFrontmatter } from "shared";
import {
  resolveFeaturedProject,
  resolveGalleryProjects,
  sortProjectsForDisplay,
} from "./project-display";

function project(overrides: Partial<ProjectFrontmatter>): ProjectFrontmatter {
  return {
    title: "Project",
    description: "Description",
    date: "2026-01-01T00:00:00Z",
    tags: [],
    type: "project",
    draft: false,
    slug: "project",
    coverImage: "/images/projects/project.svg",
    coverImageAlt: "Project artwork.",
    featured: false,
    projectOrder: 0,
    links: [],
    ...overrides,
  };
}

describe("project-display helpers", () => {
  test("sortProjectsForDisplay orders by projectOrder first and date second", () => {
    const projects = [
      project({ slug: "latest", title: "Latest", projectOrder: 20, date: "2026-03-01T00:00:00Z" }),
      project({ slug: "featured", title: "Featured", projectOrder: 10, date: "2026-01-01T00:00:00Z" }),
      project({ slug: "same-order-newer", title: "Same Order Newer", projectOrder: 20, date: "2026-04-01T00:00:00Z" }),
    ];

    expect(sortProjectsForDisplay(projects).map((item) => item.slug)).toEqual([
      "featured",
      "same-order-newer",
      "latest",
    ]);
  });

  test("resolveFeaturedProject prefers the first sorted featured project", () => {
    const projects = [
      project({ slug: "gallery", projectOrder: 5, featured: false }),
      project({ slug: "featured-b", projectOrder: 30, featured: true }),
      project({ slug: "featured-a", projectOrder: 10, featured: true }),
    ];

    expect(resolveFeaturedProject(projects)?.slug).toBe("featured-a");
  });

  test("resolveFeaturedProject falls back to the first sorted project", () => {
    const projects = [
      project({ slug: "second", projectOrder: 20 }),
      project({ slug: "first", projectOrder: 10 }),
    ];

    expect(resolveFeaturedProject(projects)?.slug).toBe("first");
  });

  test("resolveGalleryProjects excludes the resolved featured project", () => {
    const projects = [
      project({ slug: "featured", projectOrder: 10, featured: true }),
      project({ slug: "gallery-a", projectOrder: 20 }),
      project({ slug: "gallery-b", projectOrder: 30 }),
    ];

    expect(resolveGalleryProjects(projects).map((item) => item.slug)).toEqual(["gallery-a", "gallery-b"]);
  });
});
```

- [ ] **Step 2: Run the helper test and confirm it fails**

Run: `bun test front-end/src/features/projects/project-display.test.ts`

Expected: FAIL because `project-display.ts` does not exist.

- [ ] **Step 3: Implement the display helpers**

Create `front-end/src/features/projects/project-display.ts`:

```ts
import type { ProjectFrontmatter } from "shared";

function compareProjectDatesDescending(left: ProjectFrontmatter, right: ProjectFrontmatter): number {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

export function sortProjectsForDisplay(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  return [...projects].sort((left, right) => {
    if (left.projectOrder !== right.projectOrder) {
      return left.projectOrder - right.projectOrder;
    }

    return compareProjectDatesDescending(left, right);
  });
}

export function resolveFeaturedProject(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter | null {
  const sortedProjects = sortProjectsForDisplay(projects);
  return sortedProjects.find((project) => project.featured) ?? sortedProjects[0] ?? null;
}

export function resolveGalleryProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const featuredProject = resolveFeaturedProject(projects);
  if (featuredProject === null) {
    return [];
  }

  return sortProjectsForDisplay(projects).filter((project) => project.slug !== featuredProject.slug);
}
```

- [ ] **Step 4: Run helper tests and full front-end tests**

Run: `bun test front-end/src/features/projects/project-display.test.ts`

Expected: PASS.

Run: `bun test front-end`

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add front-end/src/features/projects/project-display.ts front-end/src/features/projects/project-display.test.ts
git commit -m "feat(projects): add display ordering helpers"
```

## Task 4: Redesign Projects Landing Page

**Files:**
- Modify: `front-end/src/features/projects/pages/ProjectsPage.tsx`
- Create: `front-end/src/features/projects/pages/ProjectsPage.layout.test.ts`

- [ ] **Step 1: Write failing landing page layout tests**

Create `front-end/src/features/projects/pages/ProjectsPage.layout.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import type { ProjectFrontmatter } from "shared";
import {
  PROJECTS_PAGE_LAYOUT_CLASSES,
  PROJECTS_PAGE_TEXT,
  PROJECTS_PAGE_TYPOGRAPHY_CLASSES,
  ProjectCard,
} from "./ProjectsPage";

const sampleProject: ProjectFrontmatter = {
  title: "Personal Website Platform",
  description: "A full-stack personal website for articles, projects, and long-form markdown content.",
  date: "2026-06-10T00:00:00Z",
  tags: ["React", "Fastify"],
  type: "project",
  draft: false,
  slug: "personal-website-platform",
  coverImage: "/images/projects/personal-website-platform.svg",
  coverImageAlt: "Abstract website artwork.",
  featured: true,
  projectOrder: 10,
  status: "Shipped",
  role: "Full-stack developer",
  timeframe: "2026",
  links: [{ type: "repo", label: "Source repository", href: "https://example.com/repo" }],
  outcome: "Built a maintainable home for articles, projects, and experiments.",
};

describe("PROJECTS_PAGE layout constants", () => {
  test("uses the shared page and well surfaces", () => {
    expect(PROJECTS_PAGE_LAYOUT_CLASSES.main).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(PROJECTS_PAGE_LAYOUT_CLASSES.heroWell).toContain("bg-[var(--site-section-well-bg)]");
    expect(PROJECTS_PAGE_LAYOUT_CLASSES.featuredGrid).toContain("lg:grid-cols-[1.25fr_0.75fr]");
    expect(PROJECTS_PAGE_LAYOUT_CLASSES.galleryGrid).toContain("sm:grid-cols-2");
    expect(PROJECTS_PAGE_LAYOUT_CLASSES.galleryGrid).toContain("xl:grid-cols-3");
  });

  test("uses readable project page typography", () => {
    expect(PROJECTS_PAGE_TYPOGRAPHY_CLASSES.eyebrow).toContain("uppercase");
    expect(PROJECTS_PAGE_TYPOGRAPHY_CLASSES.title).toContain("text-[2.5rem]");
    expect(PROJECTS_PAGE_TYPOGRAPHY_CLASSES.description).toContain("max-w-[65ch]");
    expect(PROJECTS_PAGE_TEXT.heading).toBe("Projects");
  });
});

describe("ProjectCard", () => {
  test("renders image-led project metadata and internal destination", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ProjectCard, { project: sampleProject, featured: true }),
    ));

    expect(html).toContain('href="/projects/personal-website-platform"');
    expect(html).toContain('src="/images/projects/personal-website-platform.svg"');
    expect(html).toContain('alt="Abstract website artwork."');
    expect(html).toContain("Personal Website Platform");
    expect(html).toContain("Shipped");
    expect(html).toContain("Full-stack developer");
    expect(html).toContain("Built a maintainable home");
    expect(html).toContain("View project");
  });
});
```

- [ ] **Step 2: Run the layout test and confirm it fails**

Run: `bun test front-end/src/features/projects/pages/ProjectsPage.layout.test.ts`

Expected: FAIL because the exported constants and `ProjectCard` do not exist.

- [ ] **Step 3: Replace the ProjectsPage types and constants**

In `front-end/src/features/projects/pages/ProjectsPage.tsx`, change the shared type import from `ContentFrontmatter` to `ProjectFrontmatter` and add `Button` plus helper imports:

```ts
import { ROUTES, type ProjectFrontmatter } from "shared";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { resolveFeaturedProject, resolveGalleryProjects } from "../project-display";
```

Add constants after imports:

```ts
export const PROJECTS_PAGE_LAYOUT_CLASSES = {
  main: "w-full flex-1 bg-[var(--adw-page-brown-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
  inner: "mx-auto flex w-full max-w-screen-xl flex-col gap-8",
  heroWell: "rounded-[2rem] bg-[var(--site-section-well-bg)] px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-10",
  featuredGrid: "grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch",
  galleryGrid: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
} as const;

export const PROJECTS_PAGE_TYPOGRAPHY_CLASSES = {
  eyebrow: "text-muted-foreground text-sm font-bold uppercase tracking-[0.18em]",
  title: "mt-3 text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] sm:text-[3.25rem] lg:text-[3.75rem]",
  description: "mt-5 max-w-[65ch] text-base leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80 sm:text-lg",
  sectionTitle: "text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
  cardTitle: "text-xl font-semibold tracking-tight",
  cardDescription: "text-muted-foreground text-sm leading-relaxed",
} as const;

export const PROJECTS_PAGE_TEXT = {
  eyebrow: "Selected work",
  heading: "Projects",
  description: "A curated set of projects that show how I build practical, maintainable systems across content, automation, and web experiences.",
  featuredHeading: "Featured project",
  galleryHeading: "More projects",
} as const;
```

- [ ] **Step 4: Add the exported ProjectCard component**

Add this component above `ProjectsPage`:

```tsx
interface ProjectCardProps {
  project: ProjectFrontmatter;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: ProjectCardProps): React.JSX.Element {
  return (
    <Card className="group h-full overflow-hidden border-border bg-card p-0 transition-colors hover:border-primary">
      <Link to={`/projects/${project.slug}`} className="flex h-full flex-col">
        <div className={featured ? "aspect-[16/10] overflow-hidden" : "aspect-[4/3] overflow-hidden"}>
          <img
            src={project.coverImage}
            alt={project.coverImageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading={featured ? "eager" : "lazy"}
          />
        </div>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.status !== undefined && <Badge variant="secondary">{project.status}</Badge>}
            {project.timeframe !== undefined && <span className="text-muted-foreground text-xs font-medium">{project.timeframe}</span>}
          </div>
          <CardTitle className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.cardTitle}>{project.title}</CardTitle>
          <CardDescription className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.cardDescription}>{project.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-4 pb-6">
          {project.outcome !== undefined && (
            <p className="text-sm font-medium text-[var(--adw-dark-4)] dark:text-[var(--adw-light-2)]">{project.outcome}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs font-bold">
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-primary text-sm font-semibold">View project</span>
        </CardContent>
      </Link>
    </Card>
  );
}
```

- [ ] **Step 5: Update ProjectsPage state and rendering**

Change state to `ProjectFrontmatter[]`:

```ts
  const [projects, setProjects] = useState<ProjectFrontmatter[]>([]);
```

Inside the loaded branch before `return`, add:

```ts
  const featuredProject = resolveFeaturedProject(projects);
  const galleryProjects = resolveGalleryProjects(projects);
```

Replace the loaded `return` JSX with:

```tsx
  return (
    <main className={PROJECTS_PAGE_LAYOUT_CLASSES.main}>
      <div className={PROJECTS_PAGE_LAYOUT_CLASSES.inner}>
        <section className={PROJECTS_PAGE_LAYOUT_CLASSES.heroWell} aria-labelledby="projects-heading">
          <p className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.eyebrow}>{PROJECTS_PAGE_TEXT.eyebrow}</p>
          <h1 id="projects-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.title}>{PROJECTS_PAGE_TEXT.heading}</h1>
          <p className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.description}>{PROJECTS_PAGE_TEXT.description}</p>
        </section>

        {featuredProject !== null && (
          <section aria-labelledby="featured-project-heading" className="flex flex-col gap-4">
            <h2 id="featured-project-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.sectionTitle}>{PROJECTS_PAGE_TEXT.featuredHeading}</h2>
            <div className={PROJECTS_PAGE_LAYOUT_CLASSES.featuredGrid}>
              <ProjectCard project={featuredProject} featured />
              <div className="rounded-[2rem] bg-[var(--site-section-well-bg)] p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:p-6">
                <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.18em]">Why this matters</p>
                <p className="mt-4 text-lg leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80">
                  {featuredProject.outcome ?? featuredProject.description}
                </p>
                <Button asChild className="mt-6 w-fit">
                  <Link to={`/projects/${featuredProject.slug}`}>Read the case study</Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {galleryProjects.length > 0 && (
          <section aria-labelledby="more-projects-heading" className="flex flex-col gap-4">
            <h2 id="more-projects-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.sectionTitle}>{PROJECTS_PAGE_TEXT.galleryHeading}</h2>
            <div className={PROJECTS_PAGE_LAYOUT_CLASSES.galleryGrid}>
              {galleryProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
```

Keep existing loading, error, and empty state branches, but update empty state copy to explain that projects are being prepared:

```tsx
<p className="text-muted-foreground">Project case studies are being prepared.</p>
```

- [ ] **Step 6: Run focused and full front-end tests**

Run: `bun test front-end/src/features/projects/pages/ProjectsPage.layout.test.ts front-end/src/features/projects/project-display.test.ts`

Expected: PASS.

Run: `bun test front-end`

Expected: PASS.

- [ ] **Step 7: Commit Task 4**

```bash
git add front-end/src/features/projects/pages/ProjectsPage.tsx front-end/src/features/projects/pages/ProjectsPage.layout.test.ts
git commit -m "feat(projects): redesign projects landing page"
```

## Task 5: Polish Markdown-First Project Detail Pages

**Files:**
- Modify: `front-end/src/features/projects/pages/ProjectPage.tsx`
- Create: `front-end/src/features/projects/pages/ProjectPage.layout.test.ts`

- [ ] **Step 1: Write failing detail page tests**

Create `front-end/src/features/projects/pages/ProjectPage.layout.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import type { ContentFrontmatter, ProjectFrontmatter } from "shared";
import {
  PROJECT_PAGE_LAYOUT_CLASSES,
  PROJECT_PAGE_TYPOGRAPHY_CLASSES,
  ProjectMetaHeader,
  isProjectData,
} from "./ProjectPage";

const project: ProjectFrontmatter & { body: string } = {
  title: "Personal Website Platform",
  description: "A full-stack personal website for articles, projects, and long-form markdown content.",
  date: "2026-06-10T00:00:00Z",
  tags: ["React", "Fastify"],
  type: "project",
  draft: false,
  slug: "personal-website-platform",
  coverImage: "/images/projects/personal-website-platform.svg",
  coverImageAlt: "Abstract website artwork.",
  featured: true,
  projectOrder: 10,
  status: "Shipped",
  role: "Full-stack developer",
  timeframe: "2026",
  links: [{ type: "repo", label: "Source repository", href: "https://example.com/repo" }],
  outcome: "Built a maintainable home for articles, projects, and experiments.",
  body: "# Body",
};

describe("ProjectPage exports", () => {
  test("uses readable markdown-first layout constants", () => {
    expect(PROJECT_PAGE_LAYOUT_CLASSES.main).toContain("bg-[var(--adw-page-brown-bg)]");
    expect(PROJECT_PAGE_LAYOUT_CLASSES.articleMeasure).toContain("mx-auto w-full max-w-[75ch]");
    expect(PROJECT_PAGE_LAYOUT_CLASSES.coverFrame).toContain("overflow-hidden");
    expect(PROJECT_PAGE_TYPOGRAPHY_CLASSES.title).toContain("text-[1.75rem] sm:text-[2rem]");
    expect(PROJECT_PAGE_TYPOGRAPHY_CLASSES.description).toContain("max-w-[65ch]");
  });

  test("isProjectData rejects article content", () => {
    const article: ContentFrontmatter & { body: string } = {
      title: "Article",
      description: "Article description",
      date: "2026-01-01T00:00:00Z",
      tags: [],
      type: "article",
      category: "Linux",
      draft: false,
      slug: "article",
      body: "# Article",
    };

    expect(isProjectData(article)).toBe(false);
    expect(isProjectData(project)).toBe(true);
  });
});

describe("ProjectMetaHeader", () => {
  test("renders breadcrumb, artwork, metadata, and external links", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ProjectMetaHeader, { project }),
    ));

    expect(html).toContain('href="/projects"');
    expect(html).toContain("Back to projects");
    expect(html).toContain('src="/images/projects/personal-website-platform.svg"');
    expect(html).toContain('alt="Abstract website artwork."');
    expect(html).toContain("Personal Website Platform");
    expect(html).toContain("Shipped");
    expect(html).toContain("Full-stack developer");
    expect(html).toContain("Built a maintainable home");
    expect(html).toContain('href="https://example.com/repo"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Source repository");
  });
});
```

- [ ] **Step 2: Run the detail page test and confirm it fails**

Run: `bun test front-end/src/features/projects/pages/ProjectPage.layout.test.ts`

Expected: FAIL because the exported constants, `ProjectMetaHeader`, and `isProjectData` do not exist.

- [ ] **Step 3: Add detail page types, constants, and type guard**

In `front-end/src/features/projects/pages/ProjectPage.tsx`, update imports:

```ts
import { ROUTES, type ContentFrontmatter, type ProjectFrontmatter } from "shared";
import { Button } from "@/shared/components/ui/button";
```

Replace `ProjectData` with:

```ts
export type ProjectData = ProjectFrontmatter & { body: string };
type ContentData = ContentFrontmatter & { body: string };
```

Add constants and guard after the type definitions:

```ts
export const PROJECT_PAGE_LAYOUT_CLASSES = {
  main: "w-full flex-1 bg-[var(--adw-page-brown-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
  articleMeasure: "mx-auto w-full max-w-[75ch]",
  coverFrame: "mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-[var(--site-section-well-bg)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]",
  metadataPanel: "mb-8 rounded-[2rem] bg-[var(--site-section-well-bg)] p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:p-6",
} as const;

export const PROJECT_PAGE_TYPOGRAPHY_CLASSES = {
  title: "text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
  description: "text-muted-foreground mt-2 max-w-[65ch] text-base leading-relaxed sm:text-lg",
  metaLabel: "text-muted-foreground text-xs font-bold uppercase tracking-[0.16em]",
  metaValue: "text-sm font-medium",
  tagBadge: "text-xs font-bold",
} as const;

export function isProjectData(value: ContentData): value is ProjectData {
  return value.type === "project";
}
```

- [ ] **Step 4: Add the exported ProjectMetaHeader component**

Add this component above `ProjectPage`:

```tsx
interface ProjectMetaHeaderProps {
  project: ProjectData;
}

export function ProjectMetaHeader({ project }: ProjectMetaHeaderProps): React.JSX.Element {
  return (
    <header className="mb-8">
      <Link to="/projects" className="text-primary mb-6 inline-flex text-sm font-semibold underline-offset-4 hover:underline">
        Back to projects
      </Link>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.coverFrame}>
        <img src={project.coverImage} alt={project.coverImageAlt} className="h-full w-full object-cover" loading="eager" />
      </div>
      <h1 className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.title}>{project.title}</h1>
      <p className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.description}>{project.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <time className="text-muted-foreground text-sm font-medium">{new Date(project.date).toLocaleDateString()}</time>
        {project.status !== undefined && <Badge variant="secondary" className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.tagBadge}>{project.status}</Badge>}
        {project.tags.map((tag) => (
          <Badge key={tag} variant="outline" className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.tagBadge}>{tag}</Badge>
        ))}
      </div>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.metadataPanel}>
        <dl className="grid gap-4 sm:grid-cols-3">
          {project.role !== undefined && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Role</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.role}</dd>
            </div>
          )}
          {project.timeframe !== undefined && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Timeframe</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.timeframe}</dd>
            </div>
          )}
          {project.outcome !== undefined && (
            <div className="sm:col-span-3">
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Outcome</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.outcome}</dd>
            </div>
          )}
        </dl>
        {project.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.links.map((link) => (
              <Button key={`${link.type}-${link.href}`} asChild variant="secondary" size="sm">
                <a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 5: Guard fetched content and render markdown-first detail page**

In `fetchProject`, change the fetch type and state assignment:

```ts
        const data = await apiGet<ContentData>(path);
        if (!cancelled) {
          if (!isProjectData(data)) {
            setNotFound(true);
            setProject(null);
            return;
          }
          setProject(data);
        }
```

Replace the final loaded `return` with:

```tsx
  return (
    <main className={PROJECT_PAGE_LAYOUT_CLASSES.main}>
      <article className={PROJECT_PAGE_LAYOUT_CLASSES.articleMeasure}>
        <ProjectMetaHeader project={project} />
        <ErrorBoundary>
          <MarkdownRenderer content={project.body} />
        </ErrorBoundary>
      </article>
    </main>
  );
```

Keep the existing loading, not-found, and error branches, but change the not-found title class to match the article page style:

```tsx
<h1 className="text-3xl font-semibold">Project not found</h1>
```

- [ ] **Step 6: Run focused and full front-end tests**

Run: `bun test front-end/src/features/projects/pages/ProjectPage.layout.test.ts`

Expected: PASS.

Run: `bun test front-end`

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add front-end/src/features/projects/pages/ProjectPage.tsx front-end/src/features/projects/pages/ProjectPage.layout.test.ts
git commit -m "feat(projects): polish project detail pages"
```

## Task 6: Final Verification And Handoff

**Files:**
- Review: all files changed by Tasks 1-5
- Update: beads issue statuses

- [ ] **Step 1: Run all project quality gates**

Run: `bun test`

Expected: PASS.

Run: `bun run typecheck`

Expected: PASS.

Run: `bun run lint`

Expected: PASS.

Run: `bun run build`

Expected: PASS.

- [ ] **Step 2: Manually inspect responsive project layouts**

Run the local app with project-standard commands. If containers are needed, use `podman` or `podman-compose`, not Docker.

Inspect `/projects` at phone, tablet, and desktop widths. Confirm:

- Hero content is readable without horizontal scroll.
- Featured artwork keeps its aspect ratio.
- Gallery is one column on phone, two columns on tablet, and three columns on wide desktop.
- Focus states remain visible on project cards and link buttons.
- Dark mode keeps artwork frames, badges, and text readable.

Inspect `/projects/personal-website-platform`. Confirm:

- Back link appears before the cover artwork.
- Cover artwork has the expected accessible alt text.
- Metadata panel renders role, timeframe, outcome, and links.
- Markdown body uses the same readable measure as articles.

- [ ] **Step 3: Verify no dependency changes were introduced**

Run: `git diff -- package.json front-end/package.json back-end/package.json shared/package.json bun.lock`

Expected: no dependency additions, removals, upgrades, or manual lockfile edits.

- [ ] **Step 4: Close beads tickets and sync tracker**

Use `bd close <id>` for each completed implementation ticket. Then run:

```bash
bd dolt status
bd dolt push
```

Expected: beads changes are synced successfully.

- [ ] **Step 5: Commit beads sync if `.beads/issues.jsonl` changed**

```bash
git status --short
git add .beads/issues.jsonl
git commit -m "chore(beads): sync issue tracker"
```

Expected: commit is created only if `.beads/issues.jsonl` is present in git status.

- [ ] **Step 6: Final git status**

Run: `git status --short --branch`

Expected: working tree has no implementation changes left uncommitted. Untracked `.superpowers/` browser-companion state may remain local and must not be committed.

## Self-Review

- Spec coverage: The metadata contract, starter content/artwork, image-led landing page, markdown-first project detail pages, article-slug guard, no-filter first version, and quality gates all map to Tasks 1-6.
- Red-flag scan: The plan uses concrete field names, file paths, commands, code snippets, and acceptance checks.
- Type consistency: The project metadata names are consistent across shared types, backend normalization, frontend helpers, and page components.
