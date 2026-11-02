import type { CSSProperties, JSX } from "react";
import { lazy, Suspense } from "react";

import type { ProjectFrontmatter } from "shared";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { httpContentLoader } from "@/shared/lib/content-loader";

import { CanyonRim } from "../components/canyon-rim";
import { CanyonStratumCard } from "../components/canyon-stratum-card";
import { HiveMetricsSection } from "../components/hive-metrics-section";
import { CANYON_STRATA } from "../config/canyon-strata";
import { revealedStrata } from "../lib/canyon-progress";

/* The scene's drawing is large and purely decorative, so it loads in its own chunk after the text. */
const CanyonScene = lazy(async () => {
  const { CanyonScene: scene } = await import("../components/canyon-scene");

  return { default: scene };
});

/** The frame the scene holds until scrolling drives it (#1056): sunset, mid-descent. */
const STATIC_FRAME: CSSProperties & { "--p": number } = { "--p": 0.5 };

/** Module-level, so it is stable across renders and the project list loads once on mount. */
async function loadProjects(): Promise<ProjectFrontmatter[]> {
  return httpContentLoader.listProjects();
}

/** The Agentic tab: how this site is built with AI agents. */
export function AgenticPage(): JSX.Element {
  const { data: projects } = useLoadOnMount(loadProjects, "Failed to load projects");

  return (
    <main id={MAIN_CONTENT_ID} className="w-full flex-1 bg-[var(--site-page-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Agentic</h1>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-5)] dark:text-white/80 sm:text-lg">
          I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the same
          checks and review as mine. This page shows how that works.
        </p>
        <div className="relative mt-8 aspect-[390/844] overflow-hidden rounded-xl sm:aspect-[16/10]" style={STATIC_FRAME}>
          <Suspense fallback={null}>
            <CanyonScene revealed={revealedStrata(STATIC_FRAME["--p"], CANYON_STRATA.length)} projects={projects ?? []} />
          </Suspense>
        </div>
        <div className="mt-8 flex flex-col gap-6">
          <CanyonRim projects={projects} />
          {CANYON_STRATA.map((stratum) => (
            <CanyonStratumCard key={stratum.id} stratum={stratum} />
          ))}
        </div>
        <div className="mt-12">
          <HiveMetricsSection />
        </div>
      </div>
    </main>
  );
}
