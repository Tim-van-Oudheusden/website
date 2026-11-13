import { describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { ProjectShowcaseCard } from "../../../../../../front-end/src/features/home/components/project-showcase-card";

function project(overrides: Partial<ProjectFrontmatter> = {}): ProjectFrontmatter {
  return {
    title: "Pi Sandbox Automation",
    description: "Automation for running and testing sandboxed workloads.",
    date: "2026-06-10",
    updated: null,
    tags: [],
    type: "project",
    draft: false,
    slug: "pi-sandbox-automation",
    socialImage: null,
    coverImage: "/images/projects/pi-sandbox-automation.svg",
    coverImageAlt: "A small computer board and container blocks.",
    featured: false,
    projectOrder: 30,
    prioritySlot: null,
    status: "Shipped",
    role: "Developer",
    created: "2026",
    links: [{ type: "repo", label: "Repository", href: "https://github.com/Tim-van-Oudheusden/website" }],
    info: null,
    ...overrides,
  };
}

function cardElement(item: ProjectFrontmatter): ReactElement {
  return createElement(MemoryRouter, null, createElement(ProjectShowcaseCard, { project: item, featured: false }));
}

function links(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);
}

describe("ProjectShowcaseCard", () => {
  test("titles the card with an h3 and captions it with status and role", () => {
    const html = renderToStaticMarkup(cardElement(project()));

    expect(html).toMatch(/<h3[^>]*>Pi Sandbox Automation<\/h3>/);
    expect(html).toMatch(/>Shipped · Developer</);
  });

  test("links a project that lists a repository to its page on this site, not to GitHub", () => {
    const [cta] = links(renderToStaticMarkup(cardElement(project())));

    expect(cta).toContain('href="/projects/pi-sandbox-automation"');
    expect(cta).not.toContain("target=");
    expect(cta).toContain('aria-label="Learn more: Pi Sandbox Automation"');
  });

  test("links a project without a repository to its page on this site", () => {
    const [cta] = links(renderToStaticMarkup(cardElement(project({
      title: "Obsidian Content Pipeline",
      slug: "obsidian-content-pipeline",
      links: [{ type: "article", label: "Notes", href: "/articles/notes" }],
    }))));

    expect(cta).toContain('href="/projects/obsidian-content-pipeline"');
    expect(cta).not.toContain("target=");
    expect(cta).toContain('aria-label="Learn more: Obsidian Content Pipeline"');
  });
});
