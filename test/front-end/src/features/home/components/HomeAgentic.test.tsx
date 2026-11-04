import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import { AGENTIC_PAGE_PATH } from "shared";

import { AGENTIC_COPY } from "../../../../../../front-end/src/features/agentic/config/agentic-copy";
import { HomeAgentic } from "../../../../../../front-end/src/features/home/components/home-agentic";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeAgenticSection } from "../../../../../../front-end/src/features/home/types/home-section";

function configuredAgenticSection(): HomeAgenticSection {
  const section = HOME_SECTIONS.find((candidate) => candidate.variant === "agentic");

  if (section?.variant !== "agentic") {
    throw new Error("HOME_SECTIONS has no agentic section");
  }

  return section;
}

function renderAgentic(): string {
  const section = configuredAgenticSection();

  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(HomeAgentic, { section })));
}

/** Text of an HTML fragment: its text nodes, joined in order, with `&amp;` decoded. */
function textOf(html: string): string {
  return [...html.matchAll(/(?:^|>)([^<]*)/g)].map((match) => match[1] ?? "").join("").replaceAll("&amp;", "&");
}

/** Opening tags of the elements that have the class. */
function tagsWithClass(html: string, className: string): string[] {
  return [...html.matchAll(/<[a-z]+ [^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => /class="([^"]*)"/.exec(tag)?.[1]?.split(" ").includes(className));
}

describe("HomeAgentic", () => {
  test("labels the agentic section with its h2", () => {
    const html = renderAgentic();

    expect(html).toMatch(/<section id="agentic"[^>]*aria-labelledby="agentic-heading"/);
    expect(html).toMatch(/<h2 id="agentic-heading"[^>]*>[^<]+<\/h2>/);
  });

  test("lists the Agentic tab's flow steps, issue to merge, in order", () => {
    const list = /<ol[^>]*>([\s\S]*?)<\/ol>/.exec(renderAgentic())?.[1] ?? "";
    const steps = [...list.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((match) => textOf(match[1] ?? ""));

    expect(steps.map((step) => step.replace(/^\d+/, ""))).toEqual(AGENTIC_COPY.flow.map((entry) => entry.step));
  });

  test("numbers the flow steps from 01", () => {
    const nodes = [...renderAgentic().matchAll(/<span class="ha-node"[^>]*>([^<]*)<\/span>/g)].map((match) => match[1]);

    expect(nodes).toEqual(AGENTIC_COPY.flow.map((_, index) => `0${String(index + 1)}`));
  });

  test.each(["ha-honeycomb", "ha-eyebrow", "ha-node", "ha-live"])(
    "hides the decorative .%s from assistive technology",
    (className) => {
      const tags = tagsWithClass(renderAgentic(), className);

      expect(tags).not.toBeEmpty();

      for (const tag of tags) {
        expect(tag).toContain('aria-hidden="true"');
      }
    },
  );

  test("links to the Agentic tab in the same tab", () => {
    const section = configuredAgenticSection();
    const cta = [...renderAgentic().matchAll(/<a [^>]*>[\s\S]*?<\/a>/g)].map((match) => match[0]);

    expect(cta).toHaveLength(1);
    expect(cta[0]).toContain(`href="${AGENTIC_PAGE_PATH}"`);
    expect(cta[0]).not.toContain("target=");
    expect(textOf(cta[0] ?? "")).toContain(section.ctaLabel);
  });
});
