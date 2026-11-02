import type { JSX, ReactNode } from "react";
import { useId } from "react";

import type { GovernorMode, HivePublicMetrics } from "shared";

import { Card } from "@/shared/components/ui/card";

import { formatClock, formatDuration, formatHour, formatHours, formatSpan, formatUtcDay } from "../lib/hive-metrics-format";

import { BarSeries } from "./charts/bar-series";
import { formatValue } from "./charts/chart-figure";
import { LineSeries } from "./charts/line-series";
import type { ModeStyle } from "./charts/mode-band";
import { ModeBand } from "./charts/mode-band";
import { StackedRow } from "./charts/stacked-row";

type HiveWidget = NonNullable<HivePublicMetrics["hive"]>;
type Contributors = NonNullable<HivePublicMetrics["contributors"]>;
type RepoActivity = NonNullable<HivePublicMetrics["repo"]>;

const HOUR_MS = 3_600_000;

const METRICS_README_URL = "https://github.com/Tim-van-Oudheusden/website/blob/main/docs/metrics/README.md";

/** Governor modes run cool to warm (metrics spec, "Charts"). */
const GOVERNOR_MODES: Readonly<Record<GovernorMode, ModeStyle>> = {
  idle: { label: "idle", tone: "base" },
  quiet: { label: "quiet", tone: "blue" },
  busy: { label: "busy", tone: "orange" },
  surge: { label: "surge", tone: "red" },
};

/** Small print under a chart: what it counts and where the numbers come from. */
function Note({ children }: { children: ReactNode }): JSX.Element {
  return <p className="text-sm text-(--ink-2) dark:text-(--paper-4)">{children}</p>;
}

interface MetricsCardProps {
  title: string;
  /** Width in the section's three-column grid from `lg`; cards stack on phones. */
  span: "wide" | "narrow";
  children: ReactNode;
}

/** One titled card of the section. */
function MetricsCard({ title, span, children }: MetricsCardProps): JSX.Element {
  const headingId = useId();

  return (
    <Card className={`px-6 ${span === "wide" ? "lg:col-span-2" : ""}`}>
      <section aria-labelledby={headingId} className="flex flex-col gap-4">
        <h3 id={headingId} className="text-lg font-semibold tracking-tight">{title}</h3>
        {children}
      </section>
    </Card>
  );
}

/** Issues, PRs and held work over the span the widget history covers. */
export function QueueCard({ hive, timeZone }: { hive: HiveWidget; timeZone: string | null }): JSX.Element {
  const first = hive.history.at(0);
  const last = hive.history.at(-1);
  const span = first === undefined || last === undefined ? null : formatSpan(first.t, last.t);

  return (
    <MetricsCard title={span === null ? "Queue, latest point" : `Queue, ${span}`} span="wide">
      <LineSeries
        caption="Open issues, open PRs and held work"
        xHeader="Time"
        xLabels={hive.history.map((point) => formatClock(point.t, timeZone))}
        series={[
          { name: "issues", tone: "blue", values: hive.history.map((point) => point.issues) },
          { name: "PRs", tone: "green", values: hive.history.map((point) => point.prs) },
          { name: "held", tone: "red", values: hive.history.map((point) => point.held) },
        ]}
      />
      <Note>One point per governor evaluation, about every 5 minutes.</Note>
    </MetricsCard>
  );
}

/** The governor's mode over the same span as the queue. */
export function ModeCard({ hive, timeZone }: { hive: HiveWidget; timeZone: string | null }): JSX.Element {
  return (
    <MetricsCard title="Governor mode" span="narrow">
      <ModeBand
        caption="Mode per governor evaluation"
        history={hive.history}
        modes={GOVERNOR_MODES}
        formatTime={(t) => formatClock(t, timeZone)}
      />
      <Note>Rises with the size of the queue: idle, quiet, busy, surge.</Note>
    </MetricsCard>
  );
}

/** Tasks completed per hour by the contributor agents connected to this hive. */
export function ContributorsCard(
  { contributors, timeZone }: { contributors: Contributors; timeZone: string | null },
): JSX.Element {
  const { tasksPerHour, fleetSize } = contributors;
  const total = tasksPerHour.reduce((sum, value) => sum + value, 0);
  const fleet = fleetSize.at(-1) ?? 0;
  // The last bucket is the hour Hive collected the series in; the ones before it step back an hour each.
  const hourLabels = tasksPerHour.map((_, index) => formatHour(
    Date.parse(contributors.collectedAt) - ((tasksPerHour.length - 1 - index) * HOUR_MS),
    timeZone,
  ));

  return (
    <MetricsCard title="Contributor agents, last 7 days" span="wide">
      <p className="text-base">
        {`${formatValue(total)} ${total === 1 ? "task" : "tasks"} · ${formatValue(fleet)} contributor ${fleet === 1 ? "agent" : "agents"} connected`}
      </p>
      {tasksPerHour.length > 0
        ? (
            <BarSeries
              caption="Tasks completed per hour"
              xHeader="Hour"
              xLabels={hourLabels}
              series={[{ name: "tasks", tone: "accent", values: tasksPerHour }]}
              layout="grouped"
            />
          )
        : <Note>No hourly series from Hive yet.</Note>}
      <Note>Tasks done by contributor agents connected to this hive.</Note>
    </MetricsCard>
  );
}

/** Run outcomes per backend. */
export function RunsCard({ contributors }: { contributors: Contributors }): JSX.Element {
  const { backends } = contributors.runs7d;

  return (
    <MetricsCard title="Runs by backend, last 7 days" span="narrow">
      {backends.length === 0 && <Note>No runs in the last 7 days.</Note>}
      {backends.map((backend) => {
        const runs = backend.completed + backend.failed + backend.abandoned;

        return (
          <div key={backend.backend} className="flex flex-col gap-2">
            <StackedRow
              caption={`${backend.backend} · ${formatValue(runs)} ${runs === 1 ? "run" : "runs"}`}
              partHeader="Outcome"
              parts={[
                { name: "completed", tone: "green", value: backend.completed },
                { name: "failed", tone: "red", value: backend.failed },
                { name: "abandoned", tone: "base", value: backend.abandoned },
              ]}
            />
            <p className="text-base tabular-nums">
              {`${backend.backend} run time: p50 ${backend.p50Seconds === null ? "not reported" : formatDuration(backend.p50Seconds)}`}
              {` · p95 ${backend.p95Seconds === null ? "not reported" : formatDuration(backend.p95Seconds)}`}
            </p>
          </div>
        );
      })}
      <Note>Percentiles are per backend; they are never added up or averaged across backends.</Note>
    </MetricsCard>
  );
}

/** This repo's pull requests per day, with time to merge. */
export function RepoPullRequestsCard({ repo }: { repo: RepoActivity }): JSX.Element {
  const stats = [
    { label: "Median time to merge", hours: repo.medianHoursToMerge },
    { label: "p90 time to merge", hours: repo.p90HoursToMerge },
  ];

  return (
    <MetricsCard title="Pull requests on this repo, last 7 days" span="wide">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <BarSeries
            caption="Pull requests per day (UTC)"
            xHeader="Day"
            xLabels={repo.days.map((day) => formatUtcDay(day.t))}
            series={[
              { name: "opened", tone: "blue", values: repo.days.map((day) => day.opened) },
              { name: "merged", tone: "green", values: repo.days.map((day) => day.merged) },
              { name: "closed unmerged", tone: "red", values: repo.days.map((day) => day.closedUnmerged) },
            ]}
            layout="grouped"
          />
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:w-40 sm:grid-cols-1">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="text-sm text-(--ink-2) dark:text-(--paper-4)">{stat.label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{stat.hours === null ? "no merges yet" : formatHours(stat.hours)}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Note>From public GitHub data for Tim-van-Oudheusden/website.</Note>
    </MetricsCard>
  );
}

/** Merged PRs per day split by who wrote them. */
export function MergedWorkCard({ repo }: { repo: RepoActivity }): JSX.Element {
  const days = repo.mergedBySource;
  const hive = days.reduce((sum, day) => sum + day.hive, 0);
  const merged = days.reduce((sum, day) => sum + day.hive + day.claudeCode + day.dependabot + day.other, 0);

  return (
    <MetricsCard title="Who wrote the merged work" span="narrow">
      <p className="text-xl font-semibold tabular-nums">
        {merged === 0
          ? "No PRs were merged in the last 7 days"
          : `Hive wrote ${formatValue(hive)} of ${formatValue(merged)} merged ${merged === 1 ? "PR" : "PRs"}`}
      </p>
      {merged > 0 && (
        <BarSeries
          caption="Merged PRs per day by author (UTC)"
          xHeader="Day"
          xLabels={days.map((day) => formatUtcDay(day.t))}
          series={[
            { name: "Hive", tone: "yellow", values: days.map((day) => day.hive) },
            { name: "Claude Code", tone: "purple", values: days.map((day) => day.claudeCode) },
            { name: "Dependabot", tone: "cyan", values: days.map((day) => day.dependabot) },
            { name: "other", tone: "base", values: days.map((day) => day.other) },
          ]}
          layout="percent"
        />
      )}
      <Note>
        Split by author, not by who merged: a PR is Hive&apos;s when its body ends with Hive&apos;s signature line,
        then a
        {" "}
        <code>claude/</code>
        {" "}
        branch counts as Claude Code in CI and a
        {" "}
        <code>dependabot/</code>
        {" "}
        branch as
        Dependabot.
        {" "}
        <a href={METRICS_README_URL} className="underline underline-offset-4 hover:text-(--site-accent)">
          How PRs are attributed
        </a>
      </Note>
    </MetricsCard>
  );
}
