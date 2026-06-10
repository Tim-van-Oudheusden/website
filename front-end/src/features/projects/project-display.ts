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

export function resolveGalleryProjects(projects: readonly ProjectFrontmatter[]): ProjectFrontmatter[] {
  const featuredProject = resolveFeaturedProject(projects);
  if (featuredProject === null) {
    return [];
  }

  return sortProjectsForDisplay(projects).filter((project) => project.slug !== featuredProject.slug);
}
