import "../flexoki.css";

import type { JSX } from "react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import type { HiveMetricsResponse } from "shared";
import { ROUTES } from "shared";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";
import { usePollingApiGet } from "@/shared/hooks/use-polling-api-get";

import { AGENTIC_COPY } from "../config/agentic-copy";
import { buildHiveViewModel } from "../lib/hive-view-model";

/* The view and its charts (ECharts) are large, so they load in their own chunk after the rest of the site. */
const PipelineView = lazy(async () => {
  const { PipelineView: view } = await import("../pipeline/pipeline-view");

  return { default: view };
});

/** How often "updated 40 s ago" re-reads the clock between polls. */
const AGE_TICK_MS = 10_000;

/**
 * The Agentic tab: how this site is built with AI agents, with the live Hive numbers. The page starts under the
 * transparent top bar (`--agentic-top-inset` is set to the bar's `--site-top-bar-height`), so its backdrop runs to the
 * top of the window.
 */
export function AgenticPage(): JSX.Element {
  // Polled once a minute while the tab is visible; the back-end caches the upstream answers.
  const poll = usePollingApiGet<HiveMetricsResponse>(ROUTES.HIVE_METRICS);
  const [now, setNow] = useState(Date.now);
  const model = useMemo(() => buildHiveViewModel(poll, now, null), [poll, now]);

  useDocumentTitle(AGENTIC_COPY.title);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, AGE_TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return (
    <main
      id={MAIN_CONTENT_ID}
      className="agentic-page -mt-(--site-top-bar-height) w-full flex-1 bg-(--site-page-bg) [--agentic-top-inset:var(--site-top-bar-height)]"
    >
      {/* Until the view's chunk loads, the page still has its title. */}
      <Suspense
        fallback={(
          <div className="mx-auto max-w-screen-xl px-4 pt-[calc(var(--site-top-bar-height)+2.5rem)] sm:px-6 lg:px-8">
            <h1 className="text-[2rem] font-semibold tracking-tight">{AGENTIC_COPY.title}</h1>
            <p className="mt-4">Loading…</p>
          </div>
        )}
      >
        <PipelineView model={model} />
      </Suspense>
    </main>
  );
}
