/**
 * Colours a chart series can take. `accent` is the site accent for the headline series, `ink` and `base` are the
 * strong and muted steps of the neutral ramp for secondary series, `hive` is the canyon's honey bedrock for what Hive's
 * agents do, and the rest are Flexoki accents (600 in light mode, 400 in dark mode). Each is a `--site-chart-*` token
 * in `index.css` with at least 3:1 contrast against `--site-section-well-bg` in both themes.
 */
export const CHART_TONES = [
  "accent",
  "ink",
  "base",
  "red",
  "orange",
  "yellow",
  "green",
  "cyan",
  "blue",
  "purple",
  "magenta",
  "hive",
] as const;

export type ChartTone = (typeof CHART_TONES)[number];

/** CSS colour for `tone`, following the active theme. */
export function toneColor(tone: ChartTone): string {
  return `var(--site-chart-${tone})`;
}
