import type { CSSProperties, JSX, ReactNode } from "react";
import { lazy, Suspense, useEffect, useRef } from "react";

import type { ProjectFrontmatter } from "shared";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { httpContentLoader } from "@/shared/lib/content-loader";

import { CanyonRim } from "../components/canyon-rim";
import { CanyonStratumCard } from "../components/canyon-stratum-card";
import { HiveMetricsSection } from "../components/hive-metrics-section";
import { CANYON_STRATA } from "../config/canyon-strata";
import { useCanyonMotion, useCanyonProgress } from "../hooks/use-canyon-progress";

/* The scene's drawing is large and purely decorative, so it loads in its own chunk after the text. */
const CanyonScene = lazy(async () => {
  const { CanyonScene: scene } = await import("../components/canyon-scene");

  return { default: scene };
});

/** The track's name as a page region: the canyon and the cards that explain it. */
const TRACK_LABEL = "How this site is built";

/** A fixed `--p` on the track, for the static (reduced-motion) frame. */
type ProgressStyle = CSSProperties & Record<"--p", number>;

/** Shared while the project list loads, so the scene's memoised rim labels stay put. */
const NO_PROJECTS: readonly ProjectFrontmatter[] = [];

/** Module-level, so it is stable across renders and the project list loads once on mount. */
async function loadProjects(): Promise<ProjectFrontmatter[]> {
  return httpContentLoader.listProjects();
}

/** Where a card's slot sits in the track: the rim opens it, Agents · Hive closes it. */
type SlotPlace = "rim" | "stratum" | "last";

/** Phone slot heights; desktop slots are all 70svh. */
const PHONE_SLOT: Readonly<Record<SlotPlace, string>> = {
  rim: "min-h-[130svh]",
  stratum: "min-h-[60svh]",
  last: "min-h-[30svh]",
};

/**
 * One card's stretch of the scroll track, the rim first.
 *
 * Desktop: card `i` starts `i` slots (70svh) down in the left column, so
 * stratum `n` reaches the top of the screen just after the water has revealed
 * it, and a deep link to its card lands with it revealed.
 *
 * Phone: the card sits at its slot's end and sticks to the bottom of the
 * screen, so it stays in the bottom third with the scene visible above. The
 * rim's slot is 130svh, so stratum `n`'s card slides in as the water reveals it
 * and is let go as the next one is revealed; a card the water has passed
 * (`passed`) fades out instead of scrolling up over the scene. A deep link
 * places a pinned card by its un-stuck position, so its 90svh scroll margin
 * puts the slot where the card is pinned and its stratum is the latest one.
 */
function TrackSlot({ place, passed, children }: {
  place: SlotPlace;
  passed: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <div
      data-passed={passed}
      className={`flex ${PHONE_SLOT[place]} flex-col justify-end sm:block sm:min-h-[70svh] sm:max-w-md`}
    >
      <div className="sticky bottom-3 transition-opacity duration-300 focus-within:opacity-100 max-sm:in-data-[passed=true]:opacity-0 max-sm:[&>section]:scroll-mt-[90svh] motion-reduce:transition-none sm:static">
        {children}
      </div>
    </div>
  );
}

/**
 * The scroll track: the scene pinned under the top bar while the rim and
 * stratum cards scroll past it. It owns the scroll state, so a reveal
 * re-renders the track (scene and cards), not the page around it.
 */
function CanyonTrack({ projects }: { projects: readonly ProjectFrontmatter[] | null }): JSX.Element {
  const trackRef = useRef<HTMLElement>(null);
  const revealed = useCanyonProgress(trackRef, CANYON_STRATA.length, true);

  return (
    <section
      ref={trackRef}
      aria-label={TRACK_LABEL}
      className="relative mt-8 min-h-[calc(100svh+6*60svh)] sm:min-h-[calc(100svh+6*70svh)]"
    >
      <div className="sticky top-[4.2rem] h-[calc(100svh-4.2rem)] overflow-hidden [--p:inherit]">
        <Suspense fallback={null}>
          <CanyonScene revealed={revealed} projects={projects ?? NO_PROJECTS} />
        </Suspense>
      </div>
      <div className="relative mx-auto -mt-[calc(100svh-4.2rem)] max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <TrackSlot place="rim" passed={revealed >= 1}>
          <CanyonRim projects={projects} />
        </TrackSlot>
        {CANYON_STRATA.map((stratum, index) => (
          <TrackSlot
            key={stratum.id}
            place={index === CANYON_STRATA.length - 1 ? "last" : "stratum"}
            passed={index < revealed - 1}
          >
            <CanyonStratumCard stratum={stratum} />
          </TrackSlot>
        ))}
      </div>
    </section>
  );
}

/** Reduced motion: the scene once, as a still sunset frame with every stratum revealed, then the cards as a list. */
function CanyonStill({ projects, progress }: {
  projects: readonly ProjectFrontmatter[] | null;
  progress: number;
}): JSX.Element {
  const frame: ProgressStyle = { "--p": progress };

  return (
    <section aria-label={TRACK_LABEL} className="mx-auto mt-8 w-full max-w-screen-xl px-4 sm:px-6 lg:px-8" style={frame}>
      {/* The still frame keeps the scene's fade into the page on, as a static edge. */}
      <div className="relative aspect-[390/844] overflow-hidden rounded-xl [--canyon-still-fade:1] [--p:inherit] sm:aspect-[16/10]">
        <Suspense fallback={null}>
          <CanyonScene revealed={CANYON_STRATA.length} projects={projects ?? NO_PROJECTS} />
        </Suspense>
      </div>
      <div className="mt-8 flex flex-col gap-6">
        <CanyonRim projects={projects} />
        {CANYON_STRATA.map((stratum) => <CanyonStratumCard key={stratum.id} stratum={stratum} />)}
      </div>
    </section>
  );
}

/** The Agentic tab: how this site is built with AI agents. */
export function AgenticPage(): JSX.Element {
  const { data: projects } = useLoadOnMount(loadProjects, "Failed to load projects");
  const motion = useCanyonMotion();

  // The cards render with the page, after the browser's own jump to the URL's fragment: jump again once they exist.
  useEffect(() => {
    const target = window.location.hash.slice(1);

    if (target.length > 0) {
      document.getElementById(target)?.scrollIntoView();
    }
  }, []);

  return (
    <main id={MAIN_CONTENT_ID} className="w-full flex-1 bg-[var(--site-page-bg)] pt-8 pb-8 sm:pt-10 sm:pb-10">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Agentic</h1>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-5)] dark:text-white/80 sm:text-lg">
          I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the same
          checks and review as mine. This page shows how that works.
        </p>
      </div>
      {motion.staticProgress === null
        ? <CanyonTrack projects={projects} />
        : <CanyonStill projects={projects} progress={motion.staticProgress} />}
      {/* After the track, the section starts inside the night fade's solid end (desktop has no cards there). */}
      <div
        className={`relative mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8 ${
          motion.staticProgress === null ? "mt-4 sm:-mt-[12svh]" : "mt-12"
        }`}
      >
        <HiveMetricsSection />
      </div>
    </main>
  );
}
