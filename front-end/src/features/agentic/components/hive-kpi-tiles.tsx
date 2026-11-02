import type { JSX } from "react";

import type { HivePublicMetrics } from "shared";

import { formatValue } from "./charts/chart-figure";
import type { ChartTone } from "./charts/chart-tones";
import { toneColor } from "./charts/chart-tones";

interface Tile {
  label: string;
  value: string;
  detail: string;
  /** A thick top edge in this tone, or null for none; decoration only, the label says what the tile is. */
  accent: ChartTone | null;
}

/** The four headline numbers, all from the latest widget history point: 2×2 on phones, 4 across from `lg`. */
export function HiveKpiTiles({ hive }: { hive: NonNullable<HivePublicMetrics["hive"]> }): JSX.Element {
  const { agents, work } = hive;
  const tiles: Tile[] = [
    {
      label: "Agents running",
      value: `${formatValue(agents.running)} / ${formatValue(agents.total)}`,
      detail: "of the agents configured",
      // The honey of the canyon's bedrock, the Agents · Hive layer the story above ends on.
      accent: "hive",
    },
    {
      label: "Open work",
      value: formatValue(work.issues + work.prs),
      detail: `${formatValue(work.issues)} issues · ${formatValue(work.prs)} PRs · ${formatValue(work.held)} held`,
      accent: null,
    },
    {
      label: "Ready to merge",
      value: formatValue(work.mergeable),
      detail: `${formatValue(work.actionable)} actionable`,
      accent: null,
    },
    { label: "Governor mode", value: hive.mode, detail: "how hard Hive is working the queue", accent: null },
  ];

  return (
    <ul aria-label="Hive right now" className="grid grid-cols-2 gap-4 lg:col-span-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.label} className="relative flex flex-col gap-1 overflow-hidden rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-6">
          {tile.accent !== null && (
            // Over the top edge rather than a thicker border, so the tile's text lines up with its neighbours'.
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: toneColor(tile.accent) }} />
          )}
          <p className="text-sm text-(--ink-2) dark:text-(--paper-4)">{tile.label}</p>
          <p className="text-3xl font-semibold tabular-nums">{tile.value}</p>
          <p className="text-sm text-(--ink-2) dark:text-(--paper-4)">{tile.detail}</p>
        </li>
      ))}
    </ul>
  );
}
