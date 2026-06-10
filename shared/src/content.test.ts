import { describe, expect, test } from "bun:test";
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

describe("content frontmatter schema", () => {
  test("CONTENT_TYPES contains article and project", () => {
    expect(CONTENT_TYPES).toContain("article");
    expect(CONTENT_TYPES).toContain("project");
  });

  test("CONTENT_TYPES has exactly two entries", () => {
    expect(CONTENT_TYPES).toHaveLength(2);
  });

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

  test("a valid ContentFrontmatter object has all required fields", () => {
    const frontmatter: ContentFrontmatter = {
      title: "Test Article",
      description: "A test article",
      date: "2026-01-15T00:00:00Z",
      tags: ["test", "example"],
      type: "article",
      category: "Linux",
      draft: false,
    };

    expect(frontmatter.title).toBe("Test Article");
    expect(frontmatter.description).toBe("A test article");
    expect(frontmatter.date).toBe("2026-01-15T00:00:00Z");
    expect(frontmatter.tags).toEqual(["test", "example"]);
    expect(frontmatter.type).toBe("article");
    expect(frontmatter.category).toBe("Linux");
    expect(frontmatter.draft).toBe(false);
    expect(frontmatter.slug).toBeUndefined();
  });

  test("slug is optional and can be set", () => {
    const frontmatter: ContentFrontmatter = {
      title: "With Slug",
      description: "Has a slug",
      date: "2026-01-15T00:00:00Z",
      tags: [],
      type: "project",
      draft: true,
      slug: "custom-slug",
      coverImage: "/images/projects/custom-slug.svg",
      coverImageAlt: "Abstract project artwork.",
      featured: false,
      projectOrder: 0,
      links: [],
    };

    expect(frontmatter.slug).toBe("custom-slug");
  });

  test("ContentType values are assignable from CONTENT_TYPES", () => {
    for (const ct of CONTENT_TYPES) {
      const typed: ContentType = ct;
      expect(typeof typed).toBe("string");
    }
  });
});
