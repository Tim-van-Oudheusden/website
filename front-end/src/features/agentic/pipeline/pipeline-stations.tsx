import type { JSX } from "react";

import { AGENTIC_COPY, AGENTIC_LINKS } from "../config/agentic-copy";
import type { ContributorsView, HiveViewModel, HiveWidgetView, RepoView } from "../lib/hive-view-model";

import {
  authorsChart,
  heatmapChart,
  modeChart,
  outcomesSankey,
  pullRequestsChart,
  queueChart,
  runsChart,
  tasksChart,
} from "./pipeline-charts";
import { ChartPanel, Gauge, Missing, percent, plural, Station } from "./pipeline-parts";

function ModeShare({ hive }: { hive: HiveWidgetView }): JSX.Element {
  return (
    <div className="pl-share">
      <div className="pl-share-bar" aria-hidden="true">
        {hive.modeShare.map((entry) => (
          <span
            key={entry.mode}
            className="pl-share-seg"
            data-mode={entry.mode}
            style={{ flexGrow: entry.share }}
          />
        ))}
      </div>
      <ul className="pl-share-list" aria-label="Share of evaluations per governor mode">
        {hive.modeShare.map((entry) => (
          <li key={entry.mode} data-mode={entry.mode}>
            <span className="pl-swatch" aria-hidden="true" />
            <span className="pl-share-mode">{entry.mode}</span>
            <span className="pl-share-value">{percent(entry.share)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QueueStation({ hive }: { hive: HiveWidgetView | null }): JSX.Element {
  if (hive === null) {
    return (
      <Station index={1} name="Queue" kicker="issues waiting">
        <Missing>{AGENTIC_COPY.missing.hive}</Missing>
      </Station>
    );
  }

  const queue = queueChart(hive);
  const mode = modeChart(hive);

  return (
    <Station index={1} name="Queue" kicker="issues waiting">
      <dl className="pl-gauges">
        <Gauge
          label="Open work"
          value={hive.work.open}
          detail={`${plural(hive.work.issues, "issue", "issues")} · ${plural(hive.work.prs, "PR", "PRs")} · `
            + `${String(hive.work.held)} held`}
        />
        <Gauge
          label="Ready to merge"
          value={hive.work.mergeable}
          detail={`${String(hive.work.actionable)} actionable`}
        />
        <Gauge label="Governor mode" value={<span className="pl-mode">{hive.mode}</span>} detail="latest evaluation" />
      </dl>
      <div className="pl-panels pl-panels--wide-first">
        <ChartPanel title={queue.table.caption} chart={queue} size="tall">
          <p>{AGENTIC_COPY.notes.queue}</p>
        </ChartPanel>
        <ChartPanel title={mode.table.caption} chart={mode} size="medium">
          <ModeShare hive={hive} />
          <p>{AGENTIC_COPY.notes.mode}</p>
        </ChartPanel>
      </div>
    </Station>
  );
}

function AgentsStation({ hive, contributors }: Pick<HiveViewModel, "hive" | "contributors">): JSX.Element {
  const tasks = contributors === null || contributors.hours.length === 0 ? null : tasksChart(contributors);
  const heatmap = contributors !== null && contributors.heatmap.days.length > 1 ? heatmapChart(contributors) : null;

  return (
    <Station index={2} name="Agents" kicker="claiming work">
      {hive === null && contributors === null
        ? null
        : (
            <dl className="pl-gauges">
              {hive === null
                ? null
                : (
                    <Gauge
                      label="Agents running"
                      value={(
                        <>
                          {hive.agents.running}
                          <span className="pl-gauge-of">{` / ${String(hive.agents.total)}`}</span>
                        </>
                      )}
                      detail={`${plural(hive.agents.total, "agent", "agents")} in the hive`}
                    />
                  )}
              {contributors === null
                ? null
                : (
                    <>
                      <Gauge
                        label="Contributor tasks"
                        value={contributors.tasksTotal}
                        detail={`${plural(contributors.tasksTotal, "task", "tasks")} · `
                          + `${plural(contributors.fleet, "contributor agent", "contributor agents")} connected`}
                      />
                      <Gauge
                        label="Peak hour"
                        value={contributors.peak === null ? "—" : contributors.peak.tasks}
                        detail={contributors.peak === null
                          ? "no tasks done yet"
                          : `${plural(contributors.peak.tasks, "task", "tasks")} at ${contributors.peak.label}`}
                      />
                    </>
                  )}
            </dl>
          )}
      {contributors === null
        ? <Missing>{AGENTIC_COPY.missing.contributors}</Missing>
        : (
            <div className={heatmap === null ? "pl-panels" : "pl-panels pl-panels--halves"}>
              {tasks === null
                ? (
                    <div className="pl-panel pl-panel--empty">
                      <p className="pl-panel-title">Tasks per hour</p>
                      <p className="pl-empty">No hourly series from Hive yet.</p>
                      <div className="pl-panel-notes"><p>{AGENTIC_COPY.notes.contributors}</p></div>
                    </div>
                  )
                : (
                    <ChartPanel title={`Tasks per hour, last ${String(contributors.hours.length)} h`} chart={tasks} size="tall">
                      <p>{AGENTIC_COPY.notes.contributors}</p>
                    </ChartPanel>
                  )}
              {heatmap === null
                ? null
                : (
                    <ChartPanel title="Tasks by day and hour" chart={heatmap} size="tall">
                      <p>Each cell is one hour; brighter cells did more tasks.</p>
                    </ChartPanel>
                  )}
            </div>
          )}
    </Station>
  );
}

function BackendCard({ backend }: { backend: ContributorsView["runs"]["backends"][number] }): JSX.Element {
  return (
    <li className="pl-backend">
      <p className="pl-backend-name">{backend.name}</p>
      <p className="pl-backend-rate">
        <span className="pl-backend-rate-value">
          {backend.successRate === null ? "—" : percent(backend.successRate)}
        </span>
        {" success"}
      </p>
      <dl className="pl-backend-stats">
        <div>
          <dt>Completed</dt>
          <dd>{backend.completed}</dd>
        </div>
        <div>
          <dt>Failed</dt>
          <dd>{backend.failed}</dd>
        </div>
        <div>
          <dt>Abandoned</dt>
          <dd>{backend.abandoned}</dd>
        </div>
        <div>
          <dt>p50</dt>
          <dd>{backend.p50 ?? "not reported"}</dd>
        </div>
        <div>
          <dt>p95</dt>
          <dd>{backend.p95 ?? "not reported"}</dd>
        </div>
      </dl>
    </li>
  );
}

function RunsStation({ contributors }: { contributors: ContributorsView | null }): JSX.Element {
  if (contributors === null) {
    return (
      <Station index={3} name="Runs" kicker="agent runs, last 7 days">
        <Missing>{AGENTIC_COPY.missing.contributors}</Missing>
      </Station>
    );
  }

  const { runs } = contributors;

  if (runs.backends.length === 0) {
    return (
      <Station index={3} name="Runs" kicker="agent runs, last 7 days">
        <p className="pl-empty">No runs in the last 7 days.</p>
        <p className="pl-note">{AGENTIC_COPY.notes.runs}</p>
      </Station>
    );
  }

  const chart = runsChart(runs.backends);

  return (
    <Station index={3} name="Runs" kicker="agent runs, last 7 days">
      <p className="pl-lede">
        <strong>{plural(runs.total, "run", "runs")}</strong>
        {` in 7 days: ${String(runs.outcomes.completed)} completed, ${String(runs.outcomes.failed)} failed, `
          + `${String(runs.outcomes.abandoned)} abandoned.`}
      </p>
      <div className="pl-panels pl-panels--runs">
        <ul className="pl-backends" aria-label="Runs per backend">
          {runs.backends.map((backend) => <BackendCard key={backend.name} backend={backend} />)}
        </ul>
        <ChartPanel
          title="Run outcomes by backend, 7 days"
          chart={chart}
          size={runs.backends.length > 2 ? "medium" : "short"}
        >
          <p>{AGENTIC_COPY.notes.runs}</p>
        </ChartPanel>
      </div>
    </Station>
  );
}

/** The caption under a pull request count: "pull request, 7 days" when it is 1. */
function weekOfPrs(count: number): string {
  return `${count === 1 ? "pull request" : "pull requests"}, 7 days`;
}

function PullRequestsStation({ repo }: { repo: RepoView | null }): JSX.Element {
  if (repo === null) {
    return (
      <Station index={4} name="Pull requests" kicker="7 UTC days">
        <Missing>{AGENTIC_COPY.missing.repo}</Missing>
      </Station>
    );
  }

  const chart = pullRequestsChart(repo);

  return (
    <Station index={4} name="Pull requests" kicker="7 UTC days">
      <dl className="pl-gauges">
        <Gauge label="Opened" value={repo.totals.opened} detail={weekOfPrs(repo.totals.opened)} />
        <Gauge label="Merged" value={repo.totals.merged} detail={weekOfPrs(repo.totals.merged)} />
        <Gauge label="Closed unmerged" value={repo.totals.closedUnmerged} detail={weekOfPrs(repo.totals.closedUnmerged)} />
        <Gauge
          label="Time to merge"
          value={repo.timeToMerge.median ?? "no merges yet"}
          detail={`median · p90 ${repo.timeToMerge.p90 ?? "no merges yet"}`}
        />
      </dl>
      <div className="pl-panels">
        <ChartPanel title="Pull requests per UTC day" chart={chart} size="tall">
          <p>{AGENTIC_COPY.notes.repo}</p>
        </ChartPanel>
      </div>
    </Station>
  );
}

function MergedStation({ repo }: { repo: RepoView | null }): JSX.Element {
  if (repo === null) {
    return (
      <Station index={5} name="Merged" kicker="who wrote it">
        <Missing>{AGENTIC_COPY.missing.repo}</Missing>
      </Station>
    );
  }

  const hive = repo.sources.find((source) => source.key === "hive");
  const attribution = (
    <div className="pl-panel-notes">
      <p>{AGENTIC_COPY.notes.attribution}</p>
      <p>
        <a className="pl-link" href={AGENTIC_LINKS.attribution.href}>{AGENTIC_LINKS.attribution.label}</a>
      </p>
    </div>
  );

  if (repo.merged === 0 || hive === undefined) {
    return (
      <Station index={5} name="Merged" kicker="who wrote it">
        <p className="pl-headline">No PRs were merged in the last 7 days</p>
        {attribution}
      </Station>
    );
  }

  const sankey = outcomesSankey(repo);
  const authors = authorsChart(repo);

  return (
    <Station index={5} name="Merged" kicker="who wrote it">
      <p className="pl-headline">
        {"Hive wrote "}
        <span className="pl-glow-number">{hive.merged}</span>
        {` of ${String(repo.merged)} merged ${repo.merged === 1 ? "PR" : "PRs"}`}
      </p>
      <ul className="pl-sources" aria-label="Merged pull requests by author">
        {repo.sources.map((source) => (
          <li key={source.key} data-source={source.key}>
            <span className="pl-swatch" aria-hidden="true" />
            {`${source.name} ${String(source.merged)} · ${percent(source.share)}`}
          </li>
        ))}
      </ul>
      <div className="pl-panels pl-panels--halves">
        <ChartPanel title="Where finished PRs went" chart={sankey} size="tall">
          <p>Finished PRs are merged plus closed unmerged, over 7 days.</p>
        </ChartPanel>
        <ChartPanel title="Merged per UTC day, by author" chart={authors} size="tall">
          <p>Each bar is one UTC day of merges.</p>
        </ChartPanel>
      </div>
      {attribution}
    </Station>
  );
}

/** The five stations from queue to merged, each a node on one glowing conduit. */
export function Stations({ model }: { model: HiveViewModel }): JSX.Element {
  return (
    <ol className="pl-line">
      <QueueStation hive={model.hive} />
      <AgentsStation hive={model.hive} contributors={model.contributors} />
      <RunsStation contributors={model.contributors} />
      <PullRequestsStation repo={model.repo} />
      <MergedStation repo={model.repo} />
    </ol>
  );
}
