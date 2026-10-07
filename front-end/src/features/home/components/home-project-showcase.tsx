import type { JSX } from "react";
import { useCallback } from "react";

import type { ProjectFrontmatter } from "shared";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

import { headingIdFor } from "../config/home-sections";
import { selectShowcaseProjects } from "../lib/showcase-projects";
import type { HomeProjectsSection } from "../types/home-section";

import { HomeSectionHeading } from "./home-section-heading";
import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";
import { ProjectShowcaseCard } from "./project-showcase-card";

/** The slot below the heading: loading note, error note, or the project grid. */
function ShowcaseContent({
  projects,
  loadError,
}: {
  projects: ProjectFrontmatter[] | null;
  loadError: boolean;
}): JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Projects could not be loaded right now. Please try again later.
      </p>
    );
  }

  if (projects === null) {
    return <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">Loading projects...</p>;
  }

  return (
    // The layout follows the grid's own width (container query), not the viewport.
    <ul className="@container/grid grid grid-cols-12 gap-6">
      {projects.map((project, index) => (
        <li key={project.slug} className={index === 0 ? "col-span-full" : "col-span-full @2xl/grid:col-span-6"}>
          <ProjectShowcaseCard project={project} featured={index === 0} />
        </li>
      ))}
    </ul>
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
