import { describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ProjectData } from "../../../../../../front-end/src/features/projects/pages/project-page";
import { ProjectMetaHeader } from "../../../../../../front-end/src/features/projects/pages/project-page";
import { ProjectCard } from "../../../../../../front-end/src/features/projects/pages/projects-page";

function project(overrides: Partial<ProjectData> = {}): ProjectData {
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
    socialImage: null,
    prioritySlot: null,
    status: null,
    role: null,
    created: null,
    info: null,
    body: "Project body",
    ...overrides,
  };
}

function renderWithRouter(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, element),
  );
}

/** The header's project links in document order: every anchor but the "Back to projects" one. */
function linkTags(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)]
    .map((match) => match[0])
    .filter((tag) => !tag.includes('href="/projects"'));
}

describe("project navigation links", () => {
  test("card links to its project page and offers a view-project affordance", () => {
    const html = renderWithRouter(createElement(ProjectCard, { project: project(), featured: false }));

    expect(html).toMatch(/<a[^>]*href="\/projects\/project"/);
    expect(html).toContain("View project");
  });

  test("detail header links back to the projects list", () => {
    const html = renderWithRouter(createElement(ProjectMetaHeader, { project: project() }));

    expect(html).toMatch(/<a[^>]*href="\/projects"/);
    expect(html).toContain("Back to projects");
  });

  test("detail header renders title, description, and metadata fields", () => {
    const withMeta = project({ role: "Full-stack developer", created: "2026", info: "A launcher for retro handhelds" });
    const html = renderWithRouter(createElement(ProjectMetaHeader, { project: withMeta }));

    expect(html).toContain("Project");
    expect(html).toContain("Description");
    expect(html).toContain("Full-stack developer");
    expect(html).toContain("2026");
    expect(html).toContain("A launcher for retro handhelds");
  });

  test("detail header renders each project link with its label and href", () => {
    const withLinks = project({
      links: [
        { type: "repo", label: "Source repository", href: "https://github.com/Tim-van-Oudheusden/website" },
        { type: "demo", label: "Live demo", href: "https://example.com" },
      ],
    });
    const html = renderWithRouter(createElement(ProjectMetaHeader, { project: withLinks }));

    expect(html).toContain("Source repository");
    expect(html).toContain("Live demo");
    expect(html).toContain('href="https://github.com/Tim-van-Oudheusden/website"');
  });

  test("detail header leads with the source repository as the primary button, the other links as secondary ones", () => {
    const withLinks = project({
      links: [
        { type: "demo", label: "Live demo", href: "https://example.com" },
        { type: "repo", label: "Source repository", href: "https://github.com/Tim-van-Oudheusden/website" },
      ],
    });
    const html = renderWithRouter(createElement(ProjectMetaHeader, { project: withLinks }));
    const external = [...html.matchAll(/<a [^>]*href="https:[^"]*"[^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);

    expect(external).toHaveLength(2);
    expect(external[0]).toContain('href="https://github.com/Tim-van-Oudheusden/website"');
    expect(external[0]).toContain('data-variant="default"');
    expect(external[0]).toContain("<svg");
    expect(external[1]).toContain('href="https://example.com"');
    expect(external[1]).toContain('data-variant="secondary"');
  });

  test("detail header marks only repository links: accent fill, default size and the GitHub icon", () => {
    const withLinks = project({
      links: [
        { type: "repo", label: "Source repository", href: "https://github.com/Tim-van-Oudheusden/website" },
        { type: "demo", label: "Live demo", href: "https://example.com" },
      ],
    });
    const [repo, demo] = linkTags(renderWithRouter(createElement(ProjectMetaHeader, { project: withLinks })));

    expect(repo).toContain("bg-(--site-accent)");
    expect(repo).toContain('data-size="default"');
    expect(repo).toContain("<svg");
    expect(demo).not.toContain("bg-(--site-accent)");
    expect(demo).toContain('data-size="sm"');
    expect(demo).not.toContain("<svg");
  });

  test("detail header keeps each link group in the order written", () => {
    const withLinks = project({
      links: [
        { type: "demo", label: "Live demo", href: "https://example.com/demo" },
        { type: "repo", label: "App repository", href: "https://github.com/example/app" },
        { type: "docs", label: "Documentation", href: "https://example.com/docs" },
        { type: "repo", label: "Site repository", href: "https://github.com/example/site" },
      ],
    });
    const hrefs = linkTags(renderWithRouter(createElement(ProjectMetaHeader, { project: withLinks })))
      .map((tag) => /href="([^"]*)"/.exec(tag)?.[1]);

    expect(hrefs).toEqual([
      "https://github.com/example/app",
      "https://github.com/example/site",
      "https://example.com/demo",
      "https://example.com/docs",
    ]);
  });

  test("detail header opens absolute links in a new tab and site links in the same tab", () => {
    const withLinks = project({
      links: [
        { type: "repo", label: "Source repository", href: "https://github.com/Tim-van-Oudheusden/website" },
        { type: "article", label: "Write-up", href: "/articles/write-up" },
      ],
    });
    const [external, internal] = linkTags(renderWithRouter(createElement(ProjectMetaHeader, { project: withLinks })));

    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');
    expect(internal).toContain('href="/articles/write-up"');
    expect(internal).not.toContain("target=");
    expect(internal).not.toContain("rel=");
  });
});
