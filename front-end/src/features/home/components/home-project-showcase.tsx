import type { JSX } from "react";
import { useCallback } from "react";

import type { ProjectFrontmatter } from "shared";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

import { headingIdFor } from "../config/home-sections";
import type { ShowcaseTileSize } from "../lib/showcase-projects";
import { selectShowcaseProjects, SHOWCASE_PROJECTS_LIMIT, showcaseTileSizes } from "../lib/showcase-projects";
import type { HomeProjectsSection } from "../types/home-section";

import { HomeLoadSlot } from "./home-load-slot";
import { HomeSectionHeading } from "./home-section-heading";
import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";
import { ProjectShowcaseCard, ProjectShowcaseCardSkeleton } from "./project-showcase-card";

/**
 * A tile's span on the 12-column track: one column below a 42rem grid, two from 42rem, three from 64rem. Spans of 6
 * and 4 columns keep the DOM order the reading order; a wide tile is two standard tiles plus the gap between them.
 */
const TILE_SPAN_CLASSES: Record<ShowcaseTileSize, string> = {
  full: "col-span-full",
  wide: "col-span-full @2xl/grid:col-span-6 @5xl/grid:col-span-8",
  standard: "col-span-full @2xl/grid:col-span-6 @5xl/grid:col-span-4",
};

/** The layout follows the grid's own width (container query), not the viewport. */
const SHOWCASE_GRID_CLASSES = "@container/grid grid grid-cols-12 gap-6";

/** The bento grid at its loaded size: a placeholder tile, sized as the showcase sizes it, per possible project. */
function ShowcaseSkeleton(): JSX.Element {
  const sizes = showcaseTileSizes(SHOWCASE_PROJECTS_LIMIT);

  return (
    <ul className={SHOWCASE_GRID_CLASSES}>
      {Array.from({ length: SHOWCASE_PROJECTS_LIMIT }, (_, position) => {
        const size = sizes[position] ?? "standard";

        return (
          // Placeholder tiles have no identity beyond their position.
          <li key={position} className={TILE_SPAN_CLASSES[size]}>
            <ProjectShowcaseCardSkeleton size={size} />
          </li>
        );
      })}
    </ul>
  );
}

/** The slot below the heading: loading skeleton, error note, or the project grid. */
function ShowcaseContent({
  projects,
  loadError,
}: {
  projects: ProjectFrontmatter[] | null;
  loadError: boolean;
}): JSX.Element {
  return (
    <HomeLoadSlot
      data={projects}
      loadError={loadError}
      errorMessage="Projects could not be loaded right now. Please try again later."
      loadingMessage="Loading projects..."
      skeleton={<ShowcaseSkeleton />}
    >
      {(loaded) => {
        const sizes = showcaseTileSizes(loaded.length);

        return (
          <ul className={SHOWCASE_GRID_CLASSES}>
            {loaded.map((project, index) => {
              const size = sizes[index] ?? "standard";

              return (
                <li key={project.slug} className={TILE_SPAN_CLASSES[size]}>
                  <ProjectShowcaseCard project={project} size={size} />
                </li>
              );
            })}
          </ul>
        );
      }}
    </HomeLoadSlot>
  );
}

interface HomeProjectShowcaseProps {
  section: HomeProjectsSection;
  loader: ContentLoader;
}

/** Home 'for-devs' section: Kent C. Dodds-style flagship showcase of Tim's projects, featured first. */
export function HomeProjectShowcase({ section, loader }: HomeProjectShowcaseProps): JSX.Element {
  const load = useCallback(async () => selectShowcaseProjects(await loader.listProjects()), [loader]);
  const { status, data: projects } = useLoadOnMount(load, "Failed to load projects");

  const featured = projects?.[0];

  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-16 md:max-w-3xl lg:max-w-296">
        <HomeSectionHeading
          headingId={headingIdFor(section.id)}
          heading={section.heading}
          subheading={featured === undefined ? section.body : section.featuredSubheading(featured.title)}
          linkLabel={section.linkLabel}
          linkTo={section.linkTo}
        />
        <ShowcaseContent projects={projects} loadError={status === "error"} />
      </div>
    </HomeSectionFrame>
  );
}
