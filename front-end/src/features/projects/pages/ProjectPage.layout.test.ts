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
    expect(PROJECT_PAGE_TYPOGRAPHY_CLASSES.title).toContain("text-[1.75rem]");
    expect(PROJECT_PAGE_TYPOGRAPHY_CLASSES.title).toContain("sm:text-[2rem]");
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
  test("uses themed well surface for metadata panel", () => {
    expect(PROJECT_PAGE_LAYOUT_CLASSES.metadataPanel).toContain("site-section-well-bg");
  });

  test("has top margin on metadata panel for separation from header metadata", () => {
    expect(PROJECT_PAGE_LAYOUT_CLASSES.metadataPanel).toMatch(/mt-/);
  });

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
