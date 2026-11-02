import type { JSX } from "react";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { httpContentLoader } from "@/shared/lib/content-loader";

import { CanyonRim } from "../components/canyon-rim";
import { CanyonStratumCard } from "../components/canyon-stratum-card";
import { CANYON_STRATA } from "../config/canyon-strata";

/** The Agentic tab: how this site is built with AI agents. */
export function AgenticPage(): JSX.Element {
  return (
    <main id={MAIN_CONTENT_ID} className="w-full flex-1 bg-[var(--site-page-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-screen-xl">
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">Agentic</h1>
        <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-[var(--ink-5)] dark:text-white/80 sm:text-lg">
          I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the same
          checks and review as mine. This page shows how that works.
        </p>
        <div className="mt-8 flex flex-col gap-6">
          <CanyonRim loader={httpContentLoader} />
          {CANYON_STRATA.map((stratum) => (
            <CanyonStratumCard key={stratum.id} stratum={stratum} />
          ))}
        </div>
      </div>
    </main>
  );
}
