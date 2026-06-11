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
  test("has vertical gap between artwork and header labels", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ProjectCard, { project: sampleProject }),
    ));

    const linkMatch = html.match(/<a class="([^"]*)"/);
    expect(linkMatch).not.toBeNull();
    expect(linkMatch![1]).toMatch(/gap-(\d+)/);
  });

  test("uses themed well surface instead of default card background", () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(ProjectCard, { project: sampleProject }),
    ));

    expect(html).toContain("site-section-well-bg");
  });

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
    expect(html).toContain("2026");
    expect(html).toContain("Built a maintainable home");
    expect(html).toContain("View case study");
  });
});
