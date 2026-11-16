import type { ProjectFrontmatter } from "shared";

import { resolveGalleryProjects, resolvePriorityProjects } from "@/features/projects/lib/project-display";

/** The lead project plus at most this many others (Kent's flagship section shows five courses). */
const SHOWCASE_OTHERS_LIMIT = 4;

/**
 * Projects for the for-devs showcase, ranked like the Projects page: its
 * priority projects first (the `prioritySlot` projects in slot order, else the
 * featured project), then the rest in display order, each once, five at most.
 */
export function selectShowcaseProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const ranked = [...resolvePriorityProjects(projects), ...resolveGalleryProjects(projects)];

  return ranked.slice(0, 1 + SHOWCASE_OTHERS_LIMIT);
}

/** The vertical caption beside a card's media: "Shipped · Developer". */
export function projectCaption(project: ProjectFrontmatter): string {
  return [project.status, project.role].filter((part) => part !== null).join(" · ");
}
