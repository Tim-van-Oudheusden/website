import { describe, expect, test } from "bun:test";

import type { ProjectFrontmatter } from "shared";

import {
  resolveFeaturedProject,
  resolveGalleryProjects,
  resolvePriorityProjects,
  sortProjectsForDisplay,
} from "../../../../../front-end/src/features/projects/lib/project-display";

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
    socialImage: null,
    prioritySlot: null,
    status: null,
    role: null,
    created: null,
    info: null,
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

  describe("resolvePriorityProjects", () => {
    test("returns projects in priority slot order when all three are set", () => {
      const projects = [
        project({ slug: "third", prioritySlot: 3 }),
        project({ slug: "first", prioritySlot: 1 }),
        project({ slug: "second", prioritySlot: 2 }),
      ];

      expect(resolvePriorityProjects(projects).map((item) => item.slug)).toEqual(["first", "second", "third"]);
    });

    test("returns partial results when fewer than three priority slots are set", () => {
      const projects = [
        project({ slug: "first", prioritySlot: 1 }),
        project({ slug: "gallery", prioritySlot: null }),
      ];

      expect(resolvePriorityProjects(projects).map((item) => item.slug)).toEqual(["first"]);
    });

    test("falls back to first sorted project when no priority slots or featured flag", () => {
      const projects = [
        project({ slug: "a", projectOrder: 10 }),
        project({ slug: "b", projectOrder: 20 }),
      ];

      const result = resolvePriorityProjects(projects);

      expect(result.length).toBe(1);
      expect(result[0]?.slug).toBe("a");
    });

    test("fallback uses featured project as slot 1 when no priority slots are set", () => {
      const projects = [
        project({ slug: "featured", featured: true, projectOrder: 10 }),
        project({ slug: "other", projectOrder: 20 }),
      ];

      const result = resolvePriorityProjects(projects);

      expect(result.length).toBe(1);
      expect(result[0]?.slug).toBe("featured");
    });

    test("duplicate prevention excludes priority projects from gallery", () => {
      const projects = [
        project({ slug: "first", prioritySlot: 1 }),
        project({ slug: "second", prioritySlot: 2 }),
        project({ slug: "gallery-a", projectOrder: 20 }),
        project({ slug: "gallery-b", projectOrder: 30 }),
      ];

      const gallery = resolveGalleryProjects(projects);

      expect(gallery.map((item) => item.slug)).toEqual(["gallery-a", "gallery-b"]);
    });
  });
});
