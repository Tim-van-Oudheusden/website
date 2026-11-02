import type { JSX } from "react";

import { formatAgo, formatClock, formatDateTime } from "../lib/hive-metrics-format";

import type { ChartTone } from "./charts/chart-tones";
import { toneColor } from "./charts/chart-tones";

/** What the section can say about its numbers; `at` is when the back-end last got a good upstream answer. */
export type HiveStatus
  = | { kind: "connecting" }
    | { kind: "live"; at: string }
    | { kind: "stale"; at: string | null }
    | { kind: "offline" };

const LABELS: Readonly<Record<HiveStatus["kind"], { label: string; tone: ChartTone }>> = {
  connecting: { label: "Connecting", tone: "base" },
  live: { label: "Live", tone: "green" },
  stale: { label: "Stale", tone: "yellow" },
  offline: { label: "Offline", tone: "red" },
};

interface HiveStatusPillProps {
  status: HiveStatus;
  now: number;
  timeZone: string | null;
}

/**
 * "Live · updated 40 s ago", "Stale · last update 14:05" or "Offline". Only the state word is a polite live region,
 * so a screen reader hears live → stale → offline, not every refresh of the age.
 */
export function HiveStatusPill({ status, now, timeZone }: HiveStatusPillProps): JSX.Element {
  const { label, tone } = LABELS[status.kind];
  let detail: JSX.Element | null = null;

  if (status.kind === "live") {
    detail = (
      <>
        {" · updated "}
        <time dateTime={status.at} title={formatDateTime(status.at, timeZone)}>{formatAgo(status.at, now)}</time>
      </>
    );
  } else if (status.kind === "stale" && status.at !== null) {
    detail = (
      <>
        {" · last update "}
        <time dateTime={status.at} title={formatDateTime(status.at, timeZone)}>{formatClock(status.at, timeZone)}</time>
      </>
    );
  }

  return (
    <p className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm text-card-foreground">
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: toneColor(tone) }} />
      <span>
        <span aria-live="polite">{label}</span>
        {detail}
      </span>
    </p>
  );
}
