import type { JSX } from "react";
import { useEffect, useState } from "react";

import type { HiveMetricsResponse } from "shared";
import { ROUTES } from "shared";

import type { PollingApiGetState } from "@/shared/hooks/use-polling-api-get";
import { usePollingApiGet } from "@/shared/hooks/use-polling-api-get";

import { HiveKpiTiles } from "./hive-kpi-tiles";
import { ContributorsCard, MergedWorkCard, ModeCard, QueueCard, RepoPullRequestsCard, RunsCard } from "./hive-metrics-cards";
import type { HiveStatus } from "./hive-status-pill";
import { HiveStatusPill } from "./hive-status-pill";

export interface HiveMetricsViewProps {
  poll: PollingApiGetState<HiveMetricsResponse>;
  /** Epoch ms the relative times are measured against. */
  now: number;
  /** IANA zone for clock times; `null` for the visitor's own. */
  timeZone: string | null;
}

function resolveStatus(poll: PollingApiGetState<HiveMetricsResponse>): HiveStatus {
  const response = poll.data;

  if (response === null) {
    return poll.status === "error" ? { kind: "offline" } : { kind: "connecting" };
  }

  if (response.state === "unavailable" || response.metrics?.online !== true) {
    return { kind: "offline" };
  }

  if (response.state === "live" && !poll.stale && response.fetchedAt !== null) {
    return { kind: "live", at: response.fetchedAt };
  }

  return { kind: "stale", at: response.fetchedAt };
}

const LINK_CLASS = "underline underline-offset-4 hover:text-(--site-accent)";

/** The one line that stands in for a part whose upstream is missing, across the whole grid row. */
function MissingPart({ children }: { children: string }): JSX.Element {
  return <p className="rounded-xl border bg-card px-6 py-4 text-base text-card-foreground lg:col-span-3">{children}</p>;
}

/** The live Hive metrics section, drawn from one polled response. */
export function HiveMetricsView({ poll, now, timeZone }: HiveMetricsViewProps): JSX.Element {
  const metrics = poll.data?.state === "unavailable" ? null : poll.data?.metrics ?? null;
  const hasAnyPart = metrics !== null
    && (metrics.hive !== null || metrics.contributors !== null || metrics.repo !== null);
  let fallback: string | null = null;

  if (poll.status === "loading") {
    fallback = "Loading the live numbers…";
  } else if (!hasAnyPart) {
    fallback = "The live numbers are not available right now: this site cannot reach Hive or GitHub. "
      + "They fill in on their own once it can.";
  }

  return (
    <section id="metrics" aria-labelledby="metrics-heading" className="flex scroll-mt-24 flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="metrics-heading" className="text-2xl font-semibold tracking-tight">The hive, live</h2>
          <p className="mt-3 max-w-[65ch] text-base leading-relaxed">
            Hive is the agent system that files, claims and lands work in this repo. These numbers come from the
            instance running on this server and from this repo&apos;s public pull requests.
          </p>
        </div>
        <HiveStatusPill status={resolveStatus(poll)} now={now} timeZone={timeZone} />
      </header>
      {fallback !== null && <p className="max-w-[65ch] text-base leading-relaxed">{fallback}</p>}
      {fallback === null && metrics !== null && (
        <div className="grid gap-6 lg:grid-cols-3">
          {metrics.hive === null
            ? <MissingPart>Live queue data is not connected right now.</MissingPart>
            : (
                <>
                  <HiveKpiTiles hive={metrics.hive} />
                  <QueueCard hive={metrics.hive} timeZone={timeZone} />
                  <ModeCard hive={metrics.hive} timeZone={timeZone} />
                </>
              )}
          {metrics.contributors === null
            ? <MissingPart>Contributor agent data is not available right now.</MissingPart>
            : (
                <>
                  <ContributorsCard contributors={metrics.contributors} timeZone={timeZone} />
                  <RunsCard contributors={metrics.contributors} />
                </>
              )}
          {metrics.repo === null
            ? <MissingPart>Pull request data for this repo is not available right now.</MissingPart>
            : (
                <>
                  <RepoPullRequestsCard repo={metrics.repo} />
                  <MergedWorkCard repo={metrics.repo} />
                </>
              )}
        </div>
      )}
      <footer className="flex max-w-[80ch] flex-col gap-1 text-sm text-(--ink-2) dark:text-(--paper-4)">
        <p>
          Hive is an open-source agent orchestrator:
          {" "}
          <a href="https://github.com/hivecommons/hive" className={LINK_CLASS}>hivecommons/hive</a>
          . How it works on this repo:
          {" "}
          <a href="https://github.com/Tim-van-Oudheusden/website/blob/main/docs/multi-agent.md" className={LINK_CLASS}>
            docs/multi-agent.md
          </a>
          .
        </p>
        <p>
          Repository names, agent names, cost and logs are deliberately not published. Each chart has a
          {" "}
          &ldquo;Show data&rdquo; table below it.
        </p>
      </footer>
    </section>
  );
}

/** How often "updated 40 s ago" re-reads the clock between polls. */
const AGE_TICK_MS = 10_000;

/** The section wired to `GET /api/hive/metrics`, polled once a minute while the tab is visible. */
export function HiveMetricsSection(): JSX.Element {
  const poll = usePollingApiGet<HiveMetricsResponse>(ROUTES.HIVE_METRICS);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, AGE_TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <HiveMetricsView poll={poll} now={now} timeZone={null} />;
}
