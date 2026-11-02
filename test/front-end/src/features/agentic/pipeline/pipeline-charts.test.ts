import { describe, expect, test } from "bun:test";

import {
  authorsChart,
  heatmapChart,
  modeChart,
  outcomesSankey,
  pullRequestsChart,
  queueChart,
  runsChart,
  tasksChart,
} from "../../../../../../front-end/src/features/agentic/pipeline/pipeline-charts";
import type { PipelineChart } from "../../../../../../front-end/src/features/agentic/pipeline/pipeline-charts";

import { liveModel } from "./pipeline-model";

function css(): string {
  return "#100f0f";
}

interface DrawnSeries {
  name?: string;
  data: unknown[];
  links?: { source: string; target: string; value: number }[];
  label?: { formatter: (params: unknown) => string };
  markPoint?: { data: unknown[] };
}

/** The series a chart draws, as ECharts receives them. */
function seriesOf(chart: PipelineChart): DrawnSeries[] {
  return chart.option(css).series as DrawnSeries[];
}

const model = liveModel();
const hive = model.hive!;
const contributors = model.contributors!;
const repo = model.repo!;

describe("pipeline charts", () => {
  test("plot the queue's issues, PRs and held work, and the governor mode, at every evaluation", () => {
    expect(seriesOf(queueChart(hive)).map((series) => [series.name, series.data])).toEqual([
      ["Issues", [3, 2, 2]],
      ["Pull requests", [2, 3, 6]],
      ["Held", [5, 26, 26]],
    ]);

    expect(seriesOf(modeChart(hive))[0]?.data).toEqual(["idle", "quiet", "busy"]);
    expect(queueChart(hive).table.caption).toBe("Queue, last 2 hours");
  });

  test("mark the busiest hour of tasks, and grid every bucket by hour and day with a readable tooltip", () => {
    const [tasks] = seriesOf(tasksChart(contributors));
    const heatmap = heatmapChart(contributors);
    const tooltip = heatmap.option(css).tooltip as { formatter: (params: unknown) => string };

    expect(tasks?.data).toEqual([1, 0, 4]);
    expect(tasks?.markPoint?.data).toEqual([{ type: "max", name: "Peak" }]);
    expect(seriesOf(heatmap)[0]?.data).toEqual([[23, 0, 1], [0, 1, 0], [1, 1, 4]]);
    expect(tooltip.formatter({ value: [1, 1, 4] })).toBe("Mon 2 Nov 01:00: 4 tasks");
    expect(tooltip.formatter({})).toBe("");
  });

  test("leave out the peak mark when no task was done", () => {
    const quiet = liveModel({
      contributors: {
        collectedAt: "2026-11-02T01:00:00.000Z",
        tasksPerHour: [0, 0],
        fleetSize: [1, 1],
        runs7d: { total: 0, backends: [] },
      },
    });

    expect(seriesOf(tasksChart(quiet.contributors!))[0]?.markPoint).toBeUndefined();
  });

  test("stack each backend's run outcomes, labelling only the parts that happened", () => {
    const series = seriesOf(runsChart(contributors.runs.backends));

    expect(series.map((part) => [part.name, part.data])).toEqual([
      ["Completed", [74, 3]],
      ["Failed", [0, 1]],
      ["Abandoned", [2, 0]],
    ]);

    expect(series[1]?.label?.formatter({ value: 0 })).toBe("");
    expect(series[1]?.label?.formatter({ value: 1 })).toBe("1");
  });

  test("draw opened, merged and closed PRs per day, and merged PRs per day only for authors who merged", () => {
    expect(seriesOf(pullRequestsChart(repo)).map((series) => [series.name, series.data])).toEqual([
      ["Opened", [6, 4]],
      ["Merged", [5, 3]],
      ["Closed unmerged", [1, 0]],
    ]);

    expect(seriesOf(authorsChart(repo)).map((series) => [series.name, series.data])).toEqual([
      ["Hive", [3, 3]],
      ["Claude Code", [1, 0]],
      ["Dependabot", [1, 0]],
    ]);
  });

  test("flow finished PRs into merged or closed, then merged PRs into their authors, labelled with counts", () => {
    const [sankey] = seriesOf(outcomesSankey(repo));

    expect(sankey?.links).toEqual([
      { source: "Finished", target: "Merged", value: 8 },
      { source: "Finished", target: "Closed unmerged", value: 1 },
      { source: "Merged", target: "Hive", value: 6 },
      { source: "Merged", target: "Claude Code", value: 1 },
      { source: "Merged", target: "Dependabot", value: 1 },
    ]);

    expect(sankey?.label?.formatter({ name: "Finished" })).toBe("Finished · 9");
    expect(sankey?.label?.formatter({ name: "Hive" })).toBe("Hive · 6");
  });
});
