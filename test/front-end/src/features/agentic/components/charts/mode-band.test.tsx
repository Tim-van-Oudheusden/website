import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { ModeBand } from "../../../../../../../front-end/src/features/agentic/components/charts/mode-band";

import { chartFigureParts } from "./chart-markup";

type Mode = "idle" | "quiet" | "busy" | "surge";

const MODES = {
  idle: { label: "idle", tone: "base" },
  quiet: { label: "quiet", tone: "blue" },
  busy: { label: "busy", tone: "orange" },
  surge: { label: "surge", tone: "red" },
} as const;

function renderBand(history: readonly { t: string; mode: Mode }[]): string {
  return renderToStaticMarkup(
    <ModeBand caption="Governor mode" history={history} modes={MODES} formatTime={(t) => t.slice(11, 16)} />,
  );
}

describe("ModeBand", () => {
  test("renders a captioned figure that labels the current mode and the changes, with one table row per segment", () => {
    const parts = chartFigureParts(
      renderBand([
        { t: "2026-11-02T00:00:00Z", mode: "quiet" },
        { t: "2026-11-02T04:00:00Z", mode: "quiet" },
        { t: "2026-11-02T08:00:00Z", mode: "busy" },
        { t: "2026-11-02T10:00:00Z", mode: "quiet" },
        { t: "2026-11-02T15:00:00Z", mode: "busy" },
        { t: "2026-11-02T17:00:00Z", mode: "busy" },
      ]),
    );

    expect(parts.caption).toBe("Governor mode");
    expect(parts.imageLabel).toBe("Governor mode: busy since 15:00; 3 mode changes since 00:00");
    expect(parts.legend).toEqual(["idle", "quiet", "busy", "surge"]);
    expect(parts.dataSummary).toBe("Show data");

    expect(parts.tableRows).toEqual([
      ["Mode", "From", "To"],
      ["quiet", "00:00", "04:00"],
      ["busy", "08:00", "08:00"],
      ["quiet", "10:00", "10:00"],
      ["busy", "15:00", "17:00"],
    ]);
  });

  test("labels a steady band and an empty history", () => {
    expect(
      chartFigureParts(
        renderBand([
          { t: "2026-11-02T00:00:00Z", mode: "idle" },
          { t: "2026-11-02T01:00:00Z", mode: "idle" },
        ]),
      ).imageLabel,
    ).toBe("Governor mode: idle since 00:00, no mode changes");

    expect(chartFigureParts(renderBand([])).imageLabel).toBe("Governor mode: no data yet");
  });
});
