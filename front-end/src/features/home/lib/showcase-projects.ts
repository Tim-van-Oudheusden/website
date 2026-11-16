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

/** A showcase tile's footprint in the bento grid: the whole row, two of three columns, or one. */
export type ShowcaseTileSize = "full" | "wide" | "standard";

function tileSizeAt(index: number, count: number): ShowcaseTileSize {
  const startsRow = index % 2 === 1;

  if (index === 0 || (startsRow && index === count - 1)) {
    return "full";
  }

  const wideFirst = Math.floor((index - 1) / 2) % 2 === 0;

  return startsRow === wideFirst ? "wide" : "standard";
}

/**
 * Tile sizes for `count` showcase projects in rank order: the lead spans its
 * row, the rest pair up in rows that alternate wide–standard and
 * standard–wide, and a lone last tile spans its row, so no row has a gap.
 */
export function showcaseTileSizes(count: number): ShowcaseTileSize[] {
  return Array.from({ length: count }, (_, index) => tileSizeAt(index, count));
}

/** The vertical caption beside a card's media: "Shipped · Developer". */
export function projectCaption(project: ProjectFrontmatter): string {
  return [project.status, project.role].filter((part) => part !== null).join(" · ");
}
