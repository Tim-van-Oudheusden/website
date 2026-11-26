import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import type { JSX, ReactNode } from "react";
import { Link } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { Button } from "@/shared/components/ui/button";

import type { ShowcaseTileSize } from "../lib/showcase-projects";
import { projectCaption } from "../lib/showcase-projects";

import { SKELETON_FILL_CLASSES, SkeletonText } from "./home-skeleton";

interface RowLayoutClasses {
  card: string;
  media: string;
  text: string;
}

/**
 * Where a tile puts its cover beside the text (on the right, content centred vertically) instead of above it:
 * a full tile from a 42rem grid, a wide tile from the 64rem three-column grid, a standard tile never. A wide tile is
 * two thirds of the grid, so its cover takes half the card to leave the text a readable measure.
 */
const ROW_LAYOUT_CLASSES: Record<ShowcaseTileSize, RowLayoutClasses> = {
  full: {
    card: "@2xl/grid:flex-row-reverse @2xl/grid:items-center @2xl/grid:gap-12",
    media: "@2xl/grid:w-[62%] @2xl/grid:flex-none",
    text: "@2xl/grid:flex-col @2xl/grid:items-start @2xl/grid:justify-center",
  },
  wide: {
    card: "@5xl/grid:flex-row-reverse @5xl/grid:items-center @5xl/grid:gap-8",
    media: "@5xl/grid:w-1/2 @5xl/grid:flex-none",
    text: "@5xl/grid:flex-col @5xl/grid:items-start @5xl/grid:justify-center",
  },
  standard: { card: "", media: "", text: "" },
};

/** Outline pill; an icon-only 44px circle while the card is narrower than 32rem. */
const CTA_CLASSES = "size-11 flex-none rounded-full border-(--paper-3) bg-(--paper-2) text-(--ink-5) shadow-none transition-colors duration-150 hover:border-(--ink-1) hover:bg-(--paper-1) dark:border-(--ink-2) dark:bg-(--popover) dark:text-(--paper-1) dark:hover:border-(--paper-3) dark:hover:bg-white/10 @lg/card:h-12 @lg/card:w-auto @lg/card:gap-2 @lg/card:pr-4 @lg/card:pl-6 @lg/card:text-base motion-reduce:transition-none";

const CTA_LABEL = "Learn more";

/** The card's call to action: the project's page on this site, where its repository and other links live. */
function ProjectCtaLink({ project }: { project: ProjectFrontmatter }): JSX.Element {
  return (
    <Button asChild variant="outline" size="icon" className={CTA_CLASSES}>
      <Link to={`/projects/${project.slug}`} aria-label={`${CTA_LABEL}: ${project.title}`}>
        <span className="sr-only @lg/card:not-sr-only">{CTA_LABEL}</span>
        <ArrowRight aria-hidden="true" className="size-5" />
      </Link>
    </Button>
  );
}

/** The cover frame's footprint: every cover is 16:10, beside or above the text. */
const COVER_FRAME_CLASSES = "flex-1 self-center rounded-xl aspect-16/10";

/** The vertical caption's box and type; hidden while the card is narrower than 24rem. */
const CAPTION_CLASSES = "hidden self-start font-mono text-[11px] tracking-widest uppercase [writing-mode:vertical-rl] rotate-180 @sm/card:block @6xl/grid:text-xs";

const TITLE_CLASSES = "text-[1.375rem] leading-7 font-semibold tracking-tight @sm/card:text-[1.5625rem] @6xl/grid:text-3xl @6xl/grid:leading-9";

const DESCRIPTION_CLASSES = "mt-2 text-base leading-6 @6xl/grid:text-lg";

interface ShowcaseCardLayoutProps {
  size: ShowcaseTileSize;
  cover: ReactNode;
  caption: ReactNode;
  /** The title and description. */
  text: ReactNode;
  cta: ReactNode;
}

/** The card's panel and where its cover, caption, text and call to action sit, shared by the card and its skeleton. */
function ShowcaseCardLayout({ size, cover, caption, text, cta }: ShowcaseCardLayoutProps): JSX.Element {
  const layout = ROW_LAYOUT_CLASSES[size];

  return (
    // The card's own width drives its container queries (caption from 24rem, CTA pill from 32rem), as on Kent's site.
    <div className="@container/card h-full">
      <div
        className={cn(
          "flex h-full flex-col gap-6 rounded-2xl bg-(--site-section-well-bg) p-6 ring-1 ring-black/5 ring-inset dark:ring-white/5 @sm/card:p-9 @6xl/grid:p-12",
          layout.card,
        )}
      >
        <div className={cn("flex gap-3", layout.media)}>
          {cover}
          {caption}
        </div>
        <div className={cn("flex flex-1 items-end justify-between gap-6", layout.text)}>
          {text}
          {cta}
        </div>
      </div>
    </div>
  );
}

interface ProjectShowcaseCardProps {
  project: ProjectFrontmatter;
  /** The tile's footprint in the showcase grid, which sets where the cover goes. */
  size: ShowcaseTileSize;
}

/**
 * Kent C. Dodds-style flagship card for a project: the cover art on a grid-line
 * panel with a vertical status caption, then the title, description and a
 * call to action. The card itself has no hover; only the call to action does.
 */
export function ProjectShowcaseCard({ project, size }: ProjectShowcaseCardProps): JSX.Element {
  return (
    <ShowcaseCardLayout
      size={size}
      cover={(
        // A centred crop to another ratio cuts the cover's own text, so it is shown whole. `self-center` keeps that
        // ratio, centred on the text, when the vertical caption beside it is taller.
        <div className={cn(COVER_FRAME_CLASSES, "overflow-hidden border border-(--paper-3) dark:border-(--popover)")}>
          <img src={project.coverImage} alt={project.coverImageAlt} loading="lazy" className="size-full object-cover" />
        </div>
      )}
      caption={(
        <span className={cn(CAPTION_CLASSES, "opacity-80 text-(--ink-1) dark:text-(--paper-1)")}>
          {projectCaption(project)}
        </span>
      )}
      text={(
        <div>
          <h3 className={cn(TITLE_CLASSES, "text-balance text-(--ink-5) dark:text-(--paper-1)")}>
            {project.title}
          </h3>
          <p className={cn(DESCRIPTION_CLASSES, "text-(--ink-2) dark:text-white/80")}>
            {project.description}
          </p>
        </div>
      )}
      cta={<ProjectCtaLink project={project} />}
    />
  );
}

/**
 * A showcase card that has not loaded yet, at the loaded card's size for its tile: the same panel and padding, a
 * 16:10 cover block, the caption strip, a title line, five description lines (a typical project description) and
 * the call to action's footprint.
 */
export function ProjectShowcaseCardSkeleton({ size }: { size: ShowcaseTileSize }): JSX.Element {
  return (
    <ShowcaseCardLayout
      size={size}
      cover={<div className={cn(SKELETON_FILL_CLASSES, COVER_FRAME_CLASSES)} />}
      // A no-break space gives the vertical strip one line's width.
      caption={<span className={cn(CAPTION_CLASSES, SKELETON_FILL_CLASSES, "h-32")}>{"\u00A0"}</span>}
      text={(
        <div className="w-full">
          <div className={TITLE_CLASSES}>
            <SkeletonText lines={1} />
          </div>
          <div className={DESCRIPTION_CLASSES}>
            <SkeletonText lines={5} />
          </div>
        </div>
      )}
      cta={<div className={cn(SKELETON_FILL_CLASSES, "size-11 flex-none rounded-full @lg/card:h-12 @lg/card:w-38")} />}
    />
  );
}
