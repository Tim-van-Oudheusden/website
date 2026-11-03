import type { ProjectFrontmatter } from "shared";

import { resolveFeaturedProject, sortProjectsForDisplay } from "@/features/projects/lib/project-display";

/** The featured project plus at most this many others (Kent's flagship section shows five courses). */
const SHOWCASE_OTHERS_LIMIT = 4;

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

/** The vertical caption beside a card's media: "Shipped · Developer". */
export function projectCaption(project: ProjectFrontmatter): string {
  return [project.status, project.role].filter((part) => part !== null).join(" · ");
}
