import type { ProjectFrontmatter } from "shared";

import { resolveFeaturedProject, sortProjectsForDisplay } from "@/features/projects/lib/project-display";

/** The featured project plus at most this many others (Kent's flagship section shows five courses). */
const SHOWCASE_OTHERS_LIMIT = 4;

/** Where a showcase card's call to action goes. */
export type ProjectCta
  = | { kind: "repo"; href: string; label: "View on GitHub" }
    | { kind: "case-study"; href: string; label: "Read case study" };

/**
 * Projects for the for-devs showcase: the featured project first, then up to
 * four more in display order, each once.
 */
export function selectShowcaseProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const featured = resolveFeaturedProject(projects);

  if (featured === null) {
    return [];
  }

  const others = sortProjectsForDisplay(projects).filter((project) => project.slug !== featured.slug);

  return [featured, ...others.slice(0, SHOWCASE_OTHERS_LIMIT)];
}

/** The project's GitHub repository when it lists one, otherwise its case study on this site. */
export function resolveProjectCta(project: ProjectFrontmatter): ProjectCta {
  const repo = project.links.find((link) => link.type === "repo");

  return repo === undefined
    ? { kind: "case-study", href: `/projects/${project.slug}`, label: "Read case study" }
    : { kind: "repo", href: repo.href, label: "View on GitHub" };
}

/** The vertical caption beside a card's media: "Shipped · Developer". */
export function projectCaption(project: ProjectFrontmatter): string {
  return [project.status, project.role].filter((part) => part !== null).join(" · ");
}
