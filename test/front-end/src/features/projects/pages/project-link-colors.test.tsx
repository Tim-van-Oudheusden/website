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

describe("project navigation links", () => {
  test("card links to its case study page and offers a view-project affordance", () => {
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
});
