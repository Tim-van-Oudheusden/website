import type { ColourTheme, FlexokiHue, FlexokiShade } from "../lib/flexoki";
import { FLEXOKI_BASE, FLEXOKI_HUES } from "../lib/flexoki";

/**
 * One candidate design of the Agentic page. Each has its own stylesheet (`designs/<slug>.css`) and one strong accent:
 * a Flexoki hue at one shade in light mode and another in dark mode.
 */
export interface AgenticDesign {
  slug: string;
  name: string;
  /** One line on what the design looks like, shown in the switcher. */
  blurb: string;
  hue: FlexokiHue;
  accent: Readonly<Record<ColourTheme, FlexokiShade>>;
}

/** The default design, for a missing or unknown `?design=`. */
const DEFAULT_DESIGN: AgenticDesign = {
  slug: "blueprint",
  name: "Blueprint",
  blurb: "A cyanotype drafting sheet: grid paper, dimension lines, stencil labels.",
  hue: "cyan",
  accent: { light: "600", dark: "300" },
};

/** The ten designs, in switcher order, the default first. */
export const AGENTIC_DESIGNS: readonly AgenticDesign[] = [
  DEFAULT_DESIGN,
  {
    slug: "terminal",
    name: "Terminal",
    blurb: "A phosphor console: monospace, bracketed panes, a blinking cursor.",
    hue: "green",
    accent: { light: "600", dark: "300" },
  },
  {
    slug: "broadsheet",
    name: "Broadsheet",
    blurb: "A newspaper front page: serif headlines, column rules, a red masthead.",
    hue: "red",
    accent: { light: "600", dark: "400" },
  },
  {
    slug: "honeycomb",
    name: "Honeycomb",
    blurb: "Hexagonal cells and a warm honey glow, for the hive itself.",
    hue: "yellow",
    accent: { light: "600", dark: "400" },
  },
  {
    slug: "aurora",
    name: "Aurora",
    blurb: "Frosted glass panes over a slow polar glow.",
    hue: "purple",
    accent: { light: "600", dark: "300" },
  },
  {
    slug: "synthwave",
    name: "Synthwave",
    blurb: "Neon edges, a horizon grid and chrome type.",
    hue: "magenta",
    accent: { light: "600", dark: "400" },
  },
  {
    slug: "bento",
    name: "Bento",
    blurb: "Rounded tiles of mixed sizes packed into one tight grid.",
    hue: "orange",
    accent: { light: "600", dark: "400" },
  },
  {
    slug: "brutalist",
    name: "Brutalist",
    blurb: "Raw slabs, heavy borders and hard offset shadows.",
    hue: "blue",
    accent: { light: "600", dark: "400" },
  },
  {
    slug: "cockpit",
    name: "Cockpit",
    blurb: "An instrument panel: bezels, amber readouts and tick marks.",
    hue: "orange",
    accent: { light: "700", dark: "300" },
  },
  {
    slug: "zen",
    name: "Zen",
    blurb: "Whitespace, hairlines and one vermilion seal.",
    hue: "red",
    accent: { light: "700", dark: "300" },
  },
];

/** The design `?design=<slug>` names; the default design for a missing or unknown slug. */
export function resolveDesign(slug: string | null): AgenticDesign {
  return AGENTIC_DESIGNS.find((design) => design.slug === slug) ?? DEFAULT_DESIGN;
}

/** The colours a design draws with in one theme, all from Flexoki. */
export interface DesignPalette {
  /** Borders, graphs, edge highlights: the design's one strong accent. */
  accent: string;
  /** The accent's hue dark (light mode) or light (dark mode) enough for body text. */
  accentText: string;
  /** A brighter tint of the accent's hue for glows; decoration only. */
  glow: string;
  /** Graph series in order, the accent first; each at least 3:1 on the theme's surfaces. */
  series: readonly string[];
  /** Body text and secondary text. */
  ink: string;
  muted: string;
  /** Axis and grid lines; decoration only. */
  grid: string;
  /** The surface tooltips sit on. */
  surface: string;
}

/** A design's palette in `theme`: the accent, its text and glow shades, the graph series and the neutrals. */
export function designPalette(design: AgenticDesign, theme: ColourTheme): DesignPalette {
  const hue = FLEXOKI_HUES[design.hue];
  const accent = hue[design.accent[theme]];

  if (theme === "light") {
    return {
      accent,
      accentText: hue["800"],
      glow: hue["200"],
      series: [accent, FLEXOKI_BASE["700"], hue["850"], FLEXOKI_BASE["500"]],
      ink: FLEXOKI_BASE.black,
      muted: FLEXOKI_BASE["700"],
      grid: FLEXOKI_BASE["150"],
      surface: FLEXOKI_BASE.paper,
    };
  }

  return {
    accent,
    accentText: hue["200"],
    glow: hue["500"],
    series: [accent, FLEXOKI_BASE["300"], hue["100"], FLEXOKI_BASE["500"]],
    ink: FLEXOKI_BASE["200"],
    muted: FLEXOKI_BASE["400"],
    grid: FLEXOKI_BASE["800"],
    surface: FLEXOKI_BASE["950"],
  };
}
