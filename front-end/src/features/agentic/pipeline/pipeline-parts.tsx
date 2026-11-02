import type { CSSProperties, JSX, ReactNode } from "react";

import { EChart } from "../components/echart";

import type { PipelineChart } from "./pipeline-charts";

/** Rounds a 0–1 share to a whole percentage. */
export function percent(share: number): string {
  return `${String(Math.round(share * 100))}%`;
}

/** "1 task", "3 tasks". */
export function plural(count: number, one: string, many: string): string {
  return `${String(count)} ${count === 1 ? one : many}`;
}

export interface GaugeProps {
  label: string;
  value: ReactNode;
  detail: ReactNode;
}

/** One live read-out on a station: a label, a big glowing number and the line that explains it. */
export function Gauge({ label, value, detail }: GaugeProps): JSX.Element {
  return (
    <div className="pl-gauge">
      <dt className="pl-gauge-label">{label}</dt>
      <dd className="pl-gauge-value">{value}</dd>
      <dd className="pl-gauge-detail">{detail}</dd>
    </div>
  );
}

export interface ChartPanelProps {
  title: string;
  chart: PipelineChart;
  size: "short" | "medium" | "tall";
  children: ReactNode;
}

/** A chart in its glass panel: title above, the chart, then its notes. */
export function ChartPanel({ title, chart, size, children }: ChartPanelProps): JSX.Element {
  return (
    <figure className="pl-panel">
      <figcaption className="pl-panel-title">{title}</figcaption>
      <EChart className={`pl-chart pl-chart--${size}`} label={chart.label} option={chart.option} table={chart.table} />
      <div className="pl-panel-notes">{children}</div>
    </figure>
  );
}

export interface StationProps {
  index: number;
  name: string;
  kicker: string;
  children: ReactNode;
}

/** One station on the line: a glowing node on the conduit, its title and everything measured there. */
export function Station({ index, name, kicker, children }: StationProps): JSX.Element {
  const id = `pl-station-${String(index)}`;

  return (
    <li className="pl-station" aria-labelledby={id} style={{ "--pl-i": index } as CSSProperties}>
      <span className="pl-rail" aria-hidden="true" />
      <span className="pl-node" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      <div className="pl-station-body">
        <p className="pl-kicker" aria-hidden="true">{`Station ${String(index).padStart(2, "0")} · ${kicker}`}</p>
        <h3 id={id} className="pl-station-title">{name}</h3>
        {children}
      </div>
    </li>
  );
}

/** The line a station shows in place of its data when its upstream is missing. */
export function Missing({ children }: { children: string }): JSX.Element {
  return <p className="pl-missing">{children}</p>;
}
