import type { CSSProperties, JSX } from "react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";

import type { HiveMetricsResponse } from "shared";
import { ROUTES } from "shared";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { usePollingApiGet } from "@/shared/hooks/use-polling-api-get";
import { useResolvedTheme } from "@/shared/hooks/use-theme";

import { DesignSwitcher } from "../components/design-switcher";
import { HiveMetricsSection } from "../components/hive-metrics-section";
import type { DesignPalette } from "../config/agentic-designs";
import { designPalette, resolveDesign } from "../config/agentic-designs";
import { useReducedMotion } from "../hooks/use-reduced-motion";

type PaletteStyle = CSSProperties & Record<`--ag-${string}`, string>;

/** The palette as the custom properties every design's stylesheet reads. */
function paletteStyle(palette: DesignPalette): PaletteStyle {
  return {
    "--ag-accent": palette.accent,
    "--ag-accent-text": palette.accentText,
    "--ag-glow": palette.glow,
    "--ag-ink": palette.ink,
    "--ag-muted": palette.muted,
    "--ag-grid": palette.grid,
    "--ag-surface": palette.surface,
    ...Object.fromEntries(palette.series.map((colour, index) => [`--ag-series-${String(index + 1)}`, colour])),
  };
}

/**
 * The Agentic tab: how this site is built with AI agents, and the live Hive numbers. `?design=<slug>` picks one of
 * the ten candidate designs; each styles the same markup through `designs/<slug>.css` and its own accent.
 */
export function AgenticPage(): JSX.Element {
  const [params] = useSearchParams();
  const design = resolveDesign(params.get("design"));
  const theme = useResolvedTheme();
  const palette = useMemo(() => designPalette(design, theme), [design, theme]);
  const animate = !useReducedMotion();
  const metrics = usePollingApiGet<HiveMetricsResponse>(ROUTES.HIVE_METRICS);

  return (
    <main id={MAIN_CONTENT_ID} className="ag-root" data-design={design.slug} style={paletteStyle(palette)}>
      <div className="ag-shell">
        <header className="ag-hero">
          <h1 className="ag-title">Agentic</h1>
          <p className="ag-text">
            I build this site with AI agents: they pick up GitHub issues and open pull requests, which go through the
            same checks and review as mine. This page shows that work as it happens.
          </p>
        </header>
        <DesignSwitcher current={design} />
        {/* Keyed by design, so each chart redraws from scratch in the new design's fonts. */}
        <HiveMetricsSection key={design.slug} poll={metrics} palette={palette} animate={animate} />
      </div>
    </main>
  );
}
