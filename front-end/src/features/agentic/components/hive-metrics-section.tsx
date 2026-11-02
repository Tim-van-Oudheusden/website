import type { JSX } from "react";
import { useEffect, useId, useState } from "react";

import type { HiveMetricsResponse } from "shared";

import type { PollingApiGetState } from "@/shared/hooks/use-polling-api-get";

import type { DesignPalette } from "../config/agentic-designs";
import type { BoardItem, HiveView, NoteSegment, PanelView } from "../lib/hive-view-model";
import { buildHiveView } from "../lib/hive-view-model";

import { HiveChart } from "./hive-chart";
import { HiveStatusPill } from "./hive-status-pill";

interface ChartLook {
  palette: DesignPalette;
  animate: boolean;
}

function Note({ segments }: { segments: readonly NoteSegment[] }): JSX.Element {
  return (
    <p className="ag-note">
      {segments.map((segment) => {
        if (segment.kind === "code") {
          return <code key={segment.text}>{segment.text}</code>;
        }

        if (segment.kind === "link") {
          return <a key={segment.text} href={segment.href} className="ag-link">{segment.text}</a>;
        }

        return segment.text;
      })}
    </p>
  );
}

/** One titled panel of the board; `data-panel` names it for the design's grid. */
function Panel({ panel, palette, animate }: { panel: PanelView } & ChartLook): JSX.Element {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="ag-panel" data-panel={panel.id}>
      <h3 id={headingId} className="ag-panel-title">{panel.title}</h3>
      {panel.lead !== null && <p className="ag-lead">{panel.lead}</p>}
      {panel.chart !== null && <HiveChart chart={panel.chart} palette={palette} animate={animate} />}
      {panel.stats.length > 0 && (
        <dl className="ag-stats">
          {panel.stats.map((stat) => (
            <div key={stat.label} className="ag-stat">
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {panel.notes.map((segments) => <Note key={segments.map((segment) => segment.text).join("")} segments={segments} />)}
    </section>
  );
}

function BoardEntry({ item, palette, animate }: { item: BoardItem } & ChartLook): JSX.Element {
  if (item.kind === "missing") {
    return <p className="ag-missing" data-part={item.part}>{item.text}</p>;
  }

  if (item.kind === "panel") {
    return <Panel panel={item.panel} palette={palette} animate={animate} />;
  }

  return (
    <ul aria-label="Hive right now" className="ag-kpis">
      {item.kpis.map((kpi) => (
        <li key={kpi.id} className="ag-kpi" data-kpi={kpi.id}>
          <p className="ag-kpi-label">{kpi.label}</p>
          <p className="ag-kpi-value">{kpi.value}</p>
          <p className="ag-kpi-detail">{kpi.detail}</p>
        </li>
      ))}
    </ul>
  );
}

function boardKey(item: BoardItem): string {
  switch (item.kind) {
    case "kpis":
      return "kpis";
    case "panel":
      return item.panel.id;
    case "missing":
      return `missing-${item.part}`;
  }
}

/** The live Hive metrics section, drawn from the view of one polled response. */
export function HiveMetricsView({ view, palette, animate }: { view: HiveView } & ChartLook): JSX.Element {
  return (
    <section id="metrics" aria-labelledby="metrics-heading" className="ag-metrics">
      <header className="ag-metrics-head">
        <div className="ag-metrics-intro">
          <h2 id="metrics-heading" className="ag-h2">The hive, live</h2>
          <p className="ag-text">
            Hive is the agent system that files, claims and lands work in this repo. These numbers come from the
            instance running on this server and from this repo&apos;s public pull requests.
          </p>
        </div>
        <HiveStatusPill status={view.status} />
      </header>
      {view.fallback !== null && <p className="ag-fallback">{view.fallback}</p>}
      {view.board.length > 0 && (
        <div className="ag-board">
          {view.board.map((item) => (
            <BoardEntry
              key={boardKey(item)}
              item={item}
              palette={palette}
              animate={animate}
            />
          ))}
        </div>
      )}
      <footer className="ag-footer">
        <p>
          Hive is an open-source agent orchestrator:
          {" "}
          <a href="https://github.com/hivecommons/hive" className="ag-link">hivecommons/hive</a>
          . How it works on this repo:
          {" "}
          <a href="https://github.com/Tim-van-Oudheusden/website/blob/main/docs/multi-agent.md" className="ag-link">
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

/** The section for the page's poll of `GET /api/hive/metrics`; it alone re-renders as the age ticks. */
export function HiveMetricsSection(
  { poll, palette, animate }: { poll: PollingApiGetState<HiveMetricsResponse> } & ChartLook,
): JSX.Element {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, AGE_TICK_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return <HiveMetricsView view={buildHiveView(poll, now, null)} palette={palette} animate={animate} />;
}
