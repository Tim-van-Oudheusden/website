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
