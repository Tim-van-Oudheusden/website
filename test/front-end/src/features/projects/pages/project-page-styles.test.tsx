import { describe, expect, test } from "bun:test";

import type { ReactElement } from "react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { ProjectCard } from "../../../../../../front-end/src/features/projects/pages/projects-page";

function project(overrides: Partial<ProjectFrontmatter> = {}): ProjectFrontmatter {
  return {
    title: "Project",
    description: "Description",
    date: "2026-01-01T00:00:00Z",
    tags: ["automation"],
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
    ...overrides,
  };
}

function renderWithRouter(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, element),
  );
}

describe("ProjectCard", () => {
  test("renders the project title, description, and cover image", () => {
    const html = renderWithRouter(createElement(ProjectCard, { project: project() }));

    expect(html).toContain("Project");
    expect(html).toContain("Description");
    expect(html).toContain('src="/images/projects/project.svg"');
    expect(html).toContain('alt="Project artwork."');
  });

  test("renders every project tag as a badge on the card", () => {
    const tagged = project({ tags: ["automation", "android"] });
    const html = renderWithRouter(createElement(ProjectCard, { project: tagged }));

    expect(html).toContain("automation");
    expect(html).toContain("android");
  });

  test("renders the project status badge when one is set, and omits it otherwise", () => {
    const withStatus = project({ status: "Shipped" });
    const withoutStatus = project({ status: null, title: "Untitled" });

    const withStatusHtml = renderWithRouter(createElement(ProjectCard, { project: withStatus }));
    const withoutStatusHtml = renderWithRouter(createElement(ProjectCard, { project: withoutStatus }));

    expect(withStatusHtml).toContain("Shipped");
    expect(withoutStatusHtml).not.toContain("Shipped");
  });
});
