import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import type { ProjectFrontmatter } from "shared";
import { ARTICLES_PAGE_TYPOGRAPHY_CLASSES } from "@/features/articles/pages/articles-page";
import { HOME_SECTIONS } from "@/features/home/config/home-sections";
import { HomeSection } from "@/features/home/components/home-section";
import { PROJECTS_PAGE_TYPOGRAPHY_CLASSES, ProjectCard } from "../../../../../../front-end/src/features/projects/pages/projects-page";

const PROJECTS_PAGE_SOURCE = readFileSync(resolve(import.meta.dir, "../../../../../../front-end/src/features/projects/pages/projects-page.tsx"), "utf8");

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
    ...overrides,
  };
}

function renderWithRouter(element: ReactElement): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, element),
  );
}

describe("project page styling", () => {
  test("renders project tags with the same inverted theme classes as article tags", () => {
    const html = renderWithRouter(createElement(ProjectCard, { project: project() }));

    expect(PROJECTS_PAGE_TYPOGRAPHY_CLASSES.projectTagBadge).toBe(ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleTagBadge);
    expect(html).toContain("bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] font-bold");
    expect(html).toContain("dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)]");
    expect(html).not.toContain("border-border text-foreground");
  });

  test("applies homepage Discover button styling to the case study CTA", () => {
    const startSection = HOME_SECTIONS.find((section) => section.id === "start");
    if (startSection === undefined) {
      throw new Error("Expected start section in homepage config");
    }

    const discoverHtml = renderToStaticMarkup(createElement(HomeSection, { section: startSection }));
    const renderedCaseStudyButtonClass = PROJECTS_PAGE_TYPOGRAPHY_CLASSES.caseStudyButton.replace("bg-[var(--adw-dark-5)]", "bg-(--adw-dark-5)");

    expect(discoverHtml).toContain(renderedCaseStudyButtonClass);
    expect(PROJECTS_PAGE_SOURCE).toContain("variant=\"secondary\" size=\"lg\"");
    expect(PROJECTS_PAGE_SOURCE).toContain("PROJECTS_PAGE_TYPOGRAPHY_CLASSES.caseStudyButton");
  });

  test("renders project cards with an inverted two-pixel hover outline and keeps image zoom", () => {
    const html = renderWithRouter(createElement(ProjectCard, { project: project() }));

    expect(html).toContain("hover:border-[var(--adw-dark-5)]");
    expect(html).toContain("dark:hover:border-[var(--adw-light-1)]");
    expect(html).toContain("hover:ring-1");
    expect(html).toContain("hover:ring-[var(--adw-dark-5)]");
    expect(html).toContain("dark:hover:ring-[var(--adw-light-1)]");
    expect(html).toContain("group-hover:scale-[1.03]");
    expect(html).not.toContain("hover:border-primary");
  });
});
