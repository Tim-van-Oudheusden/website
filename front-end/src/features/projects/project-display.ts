import type { ProjectFrontmatter } from "shared";

function compareProjectDatesDescending(left: ProjectFrontmatter, right: ProjectFrontmatter): number {
  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

export function sortProjectsForDisplay(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  return [...projects].sort((left, right) => {
    if (left.projectOrder !== right.projectOrder) {
      return left.projectOrder - right.projectOrder;
    }

    return compareProjectDatesDescending(left, right);
  });
}

export function resolveFeaturedProject(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter | null {
  const sortedProjects = sortProjectsForDisplay(projects);
  return sortedProjects.find((project) => project.featured) ?? sortedProjects[0] ?? null;
}

export function resolvePriorityProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const explicitSlots = sortProjectsForDisplay(projects)
    .filter((p) => p.prioritySlot !== undefined)
    .sort((a, b) => (a.prioritySlot ?? 0) - (b.prioritySlot ?? 0));

  if (explicitSlots.length > 0) {
    return explicitSlots;
  }

  const featured = resolveFeaturedProject(projects);
  if (featured !== null) {
    return [featured];
  }

  return [];
}

export function resolveGalleryProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const priorityProjects = resolvePriorityProjects(projects);
  const prioritySlugs = new Set(priorityProjects.map((p) => p.slug));

  if (priorityProjects.length === 0) {
    return [];
  }

  return sortProjectsForDisplay(projects).filter((project) => !prioritySlugs.has(project.slug));
}
