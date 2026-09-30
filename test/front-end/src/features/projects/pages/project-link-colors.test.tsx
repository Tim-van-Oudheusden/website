import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { ProjectMetaHeader, type ProjectData } from "../../../../../../front-end/src/features/projects/pages/project-page";
import { ProjectCard } from "../../../../../../front-end/src/features/projects/pages/projects-page";

const PROJECT_LINK_TEXT_CLASSES = "text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)]";

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
    body: "Project body",
    ...overrides,
  };
}

function renderWithRouter(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, element),
  );
}

describe("project link colors", () => {
  test("renders project card and detail navigation links with neutral palette text", () => {
    const projectData = project();
    const cardHtml = renderWithRouter(createElement(ProjectCard, { project: projectData }));
    const headerHtml = renderWithRouter(createElement(ProjectMetaHeader, { project: projectData }));

    expect(cardHtml).toContain(`${PROJECT_LINK_TEXT_CLASSES} text-sm font-semibold`);
    expect(headerHtml).toContain(`${PROJECT_LINK_TEXT_CLASSES} mb-6 inline-flex text-sm font-semibold`);
    expect(`${cardHtml}\n${headerHtml}`).not.toContain("text-primary");
  });
});
