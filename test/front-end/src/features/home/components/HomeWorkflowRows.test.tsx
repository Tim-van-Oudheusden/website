import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HomeWorkflowRows } from "../../../../../../front-end/src/features/home/components/home-workflow-rows";
import type { HomeFeatureRow } from "../../../../../../front-end/src/features/home/types/home-section";

const FIXTURE_ROWS: HomeFeatureRow[] = [
  {
    title: "Obsidian content pipeline",
    description: "Notes publish from the same vault used to write.",
    mediaLabel: "Vault to article",
  },
  {
    title: "Pi sandbox automation",
    description: "The site builds and verifies itself on a small sandbox.",
    mediaLabel: "Sandboxed build",
  },
];

function renderWorkflow(features = FIXTURE_ROWS): string {
  return renderToStaticMarkup(
    createElement(HomeWorkflowRows, {
      section: {
        id: "for-devs",
        label: "for devs",
        heading: "How I work",
        body: "The real stack behind the site.",
        bgColor: "var(--adw-page-brown-bg)",
        contentDirection: "row",
        variant: "workflow",
        features,
      },
    }),
  );
}

describe("HomeWorkflowRows", () => {
  test("renders a section with heading, intro body, and each real capability row", () => {
    const html = renderWorkflow();

    expect(html).toContain("How I work");
    expect(html).toContain("The real stack behind the site.");

    for (const row of FIXTURE_ROWS) {
      expect(html).toContain(row.title);
      expect(html).toContain(row.description);
      expect(html).toContain(row.mediaLabel);
    }
  });

  test("renders rows with alternating media-to-text order", () => {
    const html = renderWorkflow();

    expect(html).toMatch(/data-testid="workflow-row-0"[^>]*class="[^"]*md:flex-row/);
    expect(html).toMatch(/data-testid="workflow-row-1"[^>]*class="[^"]*md:flex-row-reverse/);
  });

  test("keeps each row paired title and description in one labelled article", () => {
    const html = renderWorkflow();

    expect(html).toContain("<article");
    expect(html).toContain('aria-labelledby="for-devs-workflow-row-0-title"');
  });

  test("does not render leftover placeholder feature copy", () => {
    const html = renderWorkflow();

    expect(html).not.toMatch(/placeholder alternating feature/i);
    expect(html).not.toMatch(/core capabilities at a glance/i);
  });
});
