import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AGENTIC_COPY } from "../../../../../../front-end/src/features/agentic/config/agentic-copy";
import type { HiveViewModel } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import { UNAVAILABLE_TEXT } from "../../../../../../front-end/src/features/agentic/lib/hive-view-model";
import { PipelineView } from "../../../../../../front-end/src/features/agentic/pipeline/pipeline-view";

import { liveMetrics, liveModel, modelOf } from "./pipeline-model";

function render(model: HiveViewModel): string {
  return renderToStaticMarkup(createElement(PipelineView, { model }));
}

/** The page's text without markup or the screen-reader tables, whitespace collapsed. */
function textOf(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
}

function headings(html: string, level: 1 | 2 | 3): string[] {
  return [...html.matchAll(new RegExp(`<h${String(level)}[^>]*>([^<]*)</h${String(level)}>`, "g"))].map((match) => match[1] ?? "");
}

describe("PipelineView", () => {
  test("reads as five stations, queue to merged, under the page title and the live heading", () => {
    const html = render(liveModel());

    expect(headings(html, 1)).toEqual(["Agentic"]);
    expect(headings(html, 2)).toEqual([AGENTIC_COPY.hiveHeading]);
    expect(headings(html, 3)).toEqual(["Queue", "Agents", "Runs", "Pull requests", "Merged"]);
  });

  test("puts each live number under the flow step it measures", () => {
    const html = render(liveModel());
    const units = Object.fromEntries([...html.matchAll(/<li class="pl-stop"[\s\S]*?<\/li>/g)].map(([stop]) => [
      /class="pl-stop-step">([^<]*)</.exec(stop)?.[1],
      /class="pl-readout-unit">([^<]*)</.exec(stop)?.[1],
    ]));

    expect(units).toEqual({
      "Issue": "issues open now",
      "Agent": "agents running",
      "Pull request": "PRs opened in 7 days",
      "Checks": "ready to merge now",
      "Merge &amp; deploy": "merged in 7 days",
    });
  });

  test("announces only the status word, and dates the update it describes", () => {
    const html = render(liveModel());

    expect(html).toContain("aria-live=\"polite\">Live</span>");
    expect(html).toContain("<time dateTime=\"2026-11-02T14:14:20.000Z\">updated 40 s ago</time>");
  });

  test("keeps run times per backend, and says when a backend does not report them", () => {
    const text = textOf(render(liveModel()));

    expect(text).toContain("omp 97% success");
    expect(text).toContain("p50 5 min p95 18 min");
    expect(text).toContain("p50 not reported p95 not reported");
  });

  test("credits Hive's share of the merged work, and counts a single pull request in the singular", () => {
    const text = textOf(render(liveModel()));

    expect(text).toContain("Hive wrote 6 of 8 merged PRs");
    expect(text).toContain("Closed unmerged 1 pull request, 7 days");
    expect(text).toContain("Opened 10 pull requests, 7 days");
  });

  test("replaces only a missing part with its one line, and keeps the other stations", () => {
    const text = textOf(render(liveModel({ contributors: null })));

    expect(text).toContain(AGENTIC_COPY.missing.contributors);
    expect(text).toContain("Hive wrote 6 of 8 merged PRs");
    expect(text).toContain("Open work 8");
  });

  test("shows one explanation instead of any station when nothing is available", () => {
    const html = render(modelOf({ state: "unavailable", fetchedAt: null, metrics: null }));

    expect(textOf(html)).toContain(UNAVAILABLE_TEXT);
    expect(headings(html, 3)).toEqual([]);
    expect(html).toContain("aria-live=\"polite\">Offline</span>");
  });

  test("says when nothing was merged instead of crediting anyone", () => {
    const metrics = liveMetrics();
    const repo = metrics.repo!;
    const text = textOf(render(liveModel({
      repo: {
        ...repo,
        days: repo.days.map((day) => ({ ...day, merged: 0, closedUnmerged: 0 })),
        mergedBySource: repo.mergedBySource.map((day) => ({ ...day, hive: 0, claudeCode: 0, dependabot: 0 })),
        medianHoursToMerge: null,
      },
    })));

    expect(text).toContain("No PRs were merged in the last 7 days");
    expect(text).toContain("Time to merge no merges yet");
  });
});
