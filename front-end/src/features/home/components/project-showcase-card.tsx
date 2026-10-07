import { cn } from "cn";
import { ArrowUpRight } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { Button } from "@/shared/components/ui/button";

import { projectCaption, resolveProjectCta } from "../lib/showcase-projects";

/** Outline pill; an icon-only 44px circle while the card is narrower than 32rem. */
const CTA_CLASSES = "size-11 flex-none rounded-full border-(--adw-light-3) bg-(--adw-light-2) text-(--adw-dark-5) shadow-none transition-all duration-300 hover:border-(--adw-dark-1) hover:bg-(--adw-light-1) dark:border-(--adw-dark-2) dark:bg-(--adw-headerbar-bg-color) dark:text-(--adw-light-1) dark:hover:border-(--adw-light-3) dark:hover:bg-white/10 @lg/card:h-12 @lg/card:w-auto @lg/card:gap-2 @lg/card:pr-4 @lg/card:pl-6 @lg/card:text-base motion-reduce:transition-none";

function ProjectCtaLink({ project }: { project: ProjectFrontmatter }): JSX.Element {
  const cta = resolveProjectCta(project);
  const content = (
    <>
      <span className="sr-only @lg/card:not-sr-only">{cta.label}</span>
      <ArrowUpRight aria-hidden="true" className="size-5" />
    </>
  );

  return (
    <Button asChild variant="outline" size="icon" className={CTA_CLASSES}>
      {cta.kind === "repo"
        ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" aria-label={`${cta.label}: ${project.title} (opens in a new tab)`}>
              {content}
            </a>
          )
        : (
            <Link to={cta.href} aria-label={`${cta.label}: ${project.title}`}>
              {content}
            </Link>
          )}
    </Button>
  );
}

interface ProjectShowcaseCardProps {
  project: ProjectFrontmatter;
  /** The lead card: from a 42rem grid it lays out as a row with the media on the right. */
  featured: boolean;
}

/**
 * Kent C. Dodds-style flagship card for a project: the cover art on a grid-line
 * panel with a vertical status caption, then the title, description and a
 * call to action. The card itself has no hover; only the call to action does.
 */
export function ProjectShowcaseCard({ project, featured }: ProjectShowcaseCardProps): JSX.Element {
  return (
    // The card's own width drives its container queries (caption from 24rem, CTA pill from 32rem), as on Kent's site.
    <div className="@container/card h-full">
      <div
        className={cn(
          "flex h-full flex-col gap-6 rounded-2xl bg-(--adw-view-bg-color) p-6 ring-1 ring-black/5 ring-inset dark:bg-(--adw-window-bg-color) dark:ring-white/5 @sm/card:p-9 @6xl/grid:p-12",
          featured ? "@2xl/grid:flex-row-reverse @2xl/grid:items-center @2xl/grid:gap-12" : "",
        )}
      >
        <div className={cn("flex gap-3", featured ? "@2xl/grid:w-[62%] @2xl/grid:flex-none" : "")}>
          <div
            className={cn(
              "flex-1 overflow-hidden rounded-xl border border-(--adw-light-3) aspect-4/3 dark:border-(--adw-headerbar-bg-color)",
              featured ? "@2xl/grid:aspect-11/6" : "",
            )}
          >
            <img src={project.coverImage} alt={project.coverImageAlt} loading="lazy" className="size-full object-cover" />
          </div>
          <span className="hidden self-start font-mono text-[11px] tracking-widest uppercase opacity-80 [writing-mode:vertical-rl] rotate-180 text-(--adw-dark-1) dark:text-(--adw-light-5) @sm/card:block @6xl/grid:text-xs">
            {projectCaption(project)}
          </span>
        </div>
        <div
          className={cn(
            "flex flex-1 items-end justify-between gap-6",
            featured ? "@2xl/grid:flex-col @2xl/grid:items-start @2xl/grid:justify-center" : "",
          )}
        >
          <div>
            <h3 className="text-[1.375rem] leading-7 font-semibold tracking-tight text-balance text-(--adw-dark-5) dark:text-(--adw-light-1) @sm/card:text-[1.5625rem] @6xl/grid:text-3xl @6xl/grid:leading-9">
              {project.title}
            </h3>
            <p className="mt-2 text-base leading-6 text-(--adw-dark-2) dark:text-(--adw-light-5) @6xl/grid:text-lg">
              {project.description}
            </p>
          </div>
          <ProjectCtaLink project={project} />
        </div>
      </div>
    </div>
  );
}
