import type { CSSProperties, JSX, ReactNode, RefObject } from "react";
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

/**
 * One card's stretch of the scroll track. Card `i` (the rim first) starts `i`
 * slots down, so stratum `n` reaches the top of the screen just after the water
 * has revealed it, and a deep link to its card lands with it revealed.
 */
function TrackSlot({ children }: { children: ReactNode }): JSX.Element {
  return <div className="min-h-[60svh] sm:min-h-[70svh] sm:max-w-md">{children}</div>;
}

/**
 * The scene, driven by the track's scroll position. It owns the scroll state,
 * so a reveal re-renders the scene only, not the page around it.
 */
function CanyonStage({ trackRef, scrollLinked, projects }: {
  trackRef: RefObject<HTMLElement | null>;
  scrollLinked: boolean;
  projects: readonly ProjectFrontmatter[];
}): JSX.Element {
  const scrolledReveal = useCanyonProgress(trackRef, CANYON_STRATA.length, scrollLinked);

  return (
    <Suspense fallback={null}>
      <CanyonScene revealed={scrollLinked ? scrolledReveal : CANYON_STRATA.length} projects={projects} />
    </Suspense>
  );
}

/** The Agentic tab: how this site is built with AI agents. */
export function AgenticPage(): JSX.Element {
  const { data: projects } = useLoadOnMount(loadProjects, "Failed to load projects");
  const motion = useCanyonMotion();
  const trackRef = useRef<HTMLElement>(null);
  const staticFrame: ProgressStyle | undefined = motion.staticProgress === null ? undefined : { "--p": motion.staticProgress };

  // The cards render with the page, after the browser's own jump to the URL's fragment: jump again once they exist.
  useEffect(() => {
    const target = window.location.hash.slice(1);

    if (target.length > 0) {
      document.getElementById(target)?.scrollIntoView();
    }
  }, []);

  const scene = (
    <CanyonStage trackRef={trackRef} scrollLinked={motion.scrollLinked} projects={projects ?? NO_PROJECTS} />
  );
  const cards = [
    <CanyonRim key="rim" projects={projects} />,
    ...CANYON_STRATA.map((stratum) => <CanyonStratumCard key={stratum.id} stratum={stratum} />),
  ];

  return (
    <main id={MAIN_CONTENT_ID} className="w-full flex-1 bg-[var(--site-page-bg)] pt-8 pb-8 sm:pt-10 sm:pb-10">
      <div className="mx-auto w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Agentic</h1>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-5)] dark:text-white/80 sm:text-lg">
          I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the same
          checks and review as mine. This page shows how that works.
        </p>
      </div>
      {motion.sticky
        ? (
            // The scroll track: the scene stays pinned under the top bar while the cards scroll past it.
            <section
              ref={trackRef}
              aria-label={TRACK_LABEL}
              className="relative mt-8 min-h-[calc(100svh+6*60svh)] sm:min-h-[calc(100svh+6*70svh)]"
            >
              <div className="sticky top-[4.2rem] h-[calc(100svh-4.2rem)] overflow-hidden [--p:inherit]">{scene}</div>
              <div className="relative mx-auto -mt-[calc(100svh-4.2rem)] max-w-screen-xl px-4 sm:px-6 lg:px-8">
                {cards.map((card) => <TrackSlot key={card.key}>{card}</TrackSlot>)}
              </div>
            </section>
          )
        : (
            // Reduced motion: the scene once, as a still frame, then the strata as an ordinary list.
            <section
              ref={trackRef}
              aria-label={TRACK_LABEL}
              className="mx-auto mt-8 w-full max-w-screen-xl px-4 sm:px-6 lg:px-8"
              style={staticFrame}
            >
              <div className="relative aspect-[390/844] overflow-hidden rounded-xl [--p:inherit] sm:aspect-[16/10]">
                {scene}
              </div>
              <div className="mt-8 flex flex-col gap-6">{cards}</div>
            </section>
          )}
      <div className="mx-auto mt-12 w-full max-w-screen-xl px-4 sm:px-6 lg:px-8">
        <HiveMetricsSection />
      </div>
    </main>
  );
}
