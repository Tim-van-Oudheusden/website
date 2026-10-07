import { describe, expect, test } from "bun:test";

import type { ProjectFrontmatter } from "shared";

import { projectCaption, resolveProjectCta, selectShowcaseProjects } from "../../../../../../front-end/src/features/home/lib/showcase-projects";

function project(slug: string, overrides: Partial<ProjectFrontmatter> = {}): ProjectFrontmatter {
  return {
    title: slug,
    description: `About ${slug}.`,
    date: "2026-06-10",
    tags: [],
    type: "project",
    draft: false,
    slug,
    socialImage: null,
    coverImage: `/images/projects/${slug}.svg`,
    coverImageAlt: `${slug} artwork`,
    featured: false,
    projectOrder: 10,
    prioritySlot: null,
    status: "Shipped",
    role: "Developer",
    created: "2026",
    links: [],
    info: null,
    ...overrides,
  };
}

function slugs(projects: ProjectFrontmatter[]): string[] {
  return projects.map((item) => item.slug);
}

describe("selectShowcaseProjects", () => {
  test("leads with the featured project, then the rest in display order, without repeating it", () => {
    const projects = [
      project("third", { projectOrder: 30 }),
      project("featured", { projectOrder: 20, featured: true }),
      project("first", { projectOrder: 10 }),
    ];

    expect(slugs(selectShowcaseProjects(projects))).toEqual(["featured", "first", "third"]);
  });

  test("shows the featured project plus at most four others", () => {
    const projects = Array.from({ length: 7 }, (_, index) => project(`p${String(index)}`, { projectOrder: index }));

    expect(slugs(selectShowcaseProjects(projects))).toEqual(["p0", "p1", "p2", "p3", "p4"]);
  });
});

describe("resolveProjectCta", () => {
  test("opens the project's repository on GitHub when it has one", () => {
    const cta = resolveProjectCta(project("launcher", {
      links: [
        { type: "article", label: "Notes", href: "/articles/notes" },
        { type: "repo", label: "Source", href: "https://github.com/Tim-van-Oudheusden/launcher" },
      ],
    }));

    expect(cta).toEqual({ kind: "repo", href: "https://github.com/Tim-van-Oudheusden/launcher", label: "View on GitHub" });
  });

  test("falls back to the case study when the project has no repository", () => {
    const cta = resolveProjectCta(project("pipeline", { links: [{ type: "article", label: "Notes", href: "/articles/notes" }] }));

    expect(cta).toEqual({ kind: "case-study", href: "/projects/pipeline", label: "Read case study" });
  });
});

describe("projectCaption", () => {
  test("pairs the status with the role", () => {
    expect(projectCaption(project("p", { status: "In Progress", role: "Full-stack developer" }))).toBe("In Progress · Full-stack developer");
  });

  test("leaves out whichever of status and role is missing", () => {
    expect(projectCaption(project("p", { status: null, role: "Developer" }))).toBe("Developer");
    expect(projectCaption(project("p", { status: "Planned", role: null }))).toBe("Planned");
  });
});
