import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { CanyonSceneProject } from "../../../../../../front-end/src/features/agentic/components/canyon-scene";
import { CanyonScene } from "../../../../../../front-end/src/features/agentic/components/canyon-scene";
import { CANYON_STRATA } from "../../../../../../front-end/src/features/agentic/config/canyon-strata";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

const PROJECTS: readonly CanyonSceneProject[] = [
  { slug: "dailies", title: "Dailies" },
  { slug: "minimal-android-launcher", title: "Minimal Android Launcher" },
];

/** The entities React's static renderer emits in text and attribute values. */
const ENTITIES: Readonly<Record<string, string>> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#x27;": "'" };

function decode(escaped: string): string {
  return escaped.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity] ?? entity);
}

function render(revealed = 0, projects: readonly CanyonSceneProject[] = PROJECTS): string {
  return renderToStaticMarkup(<CanyonScene revealed={revealed} projects={projects} />);
}

/** Each composition (desktop, phone) is its own stack of layer boxes; the scene must hold up in every one. */
function compositions(html: string): string[] {
  const stacks = html.split(/(?=<[a-z]+[^>]*\sdata-composition=")/).slice(1);

  expect(stacks.length).toBeGreaterThan(0);

  return stacks;
}

/** The `data-*` value of every element carrying `attribute`, in document order. */
function attributeValues(html: string, attribute: string): string[] {
  return [...html.matchAll(new RegExp(`\\s${attribute}="([^"]*)"`, "g"))].map((match) => decode(match[1] ?? ""));
}

/** The text of every `<text>` inside each element opened with `data-<name>="…"`, keyed by that value. */
function labelled(html: string, attribute: string): [string, string][] {
  const opener = new RegExp(`<g[^>]*\\s${attribute}="([^"]*)"[^>]*>`, "g");

  return [...html.matchAll(opener)].map((match) => {
    const rest = html.slice((match.index) + match[0].length);
    const text = /<text[^>]*>([^<]*)<\/text>/.exec(rest)?.[1] ?? "";

    return [decode(match[1] ?? ""), decode(text)];
  });
}

describe("CanyonScene", () => {
  test("is decorative: the scene root is hidden from assistive tech", () => {
    expect(render()).toMatch(/^<[a-z]+[^>]*\saria-hidden="true"/);
  });

  test("pins exactly one tablet per stratum, labelled from the same config as the cards", () => {
    for (const svg of compositions(render())) {
      expect(labelled(svg, "data-tablet")).toEqual(CANYON_STRATA.map((stratum) => [stratum.id, stratum.heading]));
    }
  });

  test("stands one hoodoo per pillar item on the ledges, labelled from the config", () => {
    for (const svg of compositions(render())) {
      expect(attributeValues(svg, "data-pillar")).toEqual(CANYON_STRATA.flatMap((stratum) => stratum.pillars));
    }
  });

  test("flies one flag per project on the rim, newest first, and none without projects", () => {
    for (const svg of compositions(render())) {
      expect(labelled(svg, "data-project")).toEqual([
        ["dailies", "Dailies"],
        ["minimal-android-launcher", "Minimal Android Launcher"],
      ]);
    }

    for (const svg of compositions(render(0, []))) {
      expect(attributeValues(svg, "data-project")).toEqual([]);
    }
  });

  test("marks each stratum revealed from the rim down, as many as the revealed prop says", () => {
    for (const revealed of [0, 2, 6]) {
      for (const svg of compositions(render(revealed))) {
        const strata = [...svg.matchAll(/<g[^>]*\sdata-tablet="([^"]*)"[^>]*>/g)].map((match) => [
          match[1],
          /\sdata-revealed="([^"]*)"/.exec(match[0])?.[1],
        ]);

        expect(strata).toEqual(CANYON_STRATA.map((stratum, index) => [stratum.id, String(index < revealed)]));
      }
    }
  });

  describe("in the browser", () => {
    beforeAll(async () => {
      await initFakeDomHarness();
    });

    afterAll(() => {
      uninstallFakeDom();
    });

    test("builds only the composition that fits the viewport, phone below the sm breakpoint", () => {
      const mount = mountIntoBody(createElement(CanyonScene, { revealed: 0, projects: PROJECTS }));

      try {
        const shown = queryFakeElements(mount.container, (el) => el.getAttribute("data-composition") !== null)
          .map((el) => el.getAttribute("data-composition"));

        expect(shown).toEqual(["phone"]);
      } finally {
        unmountFakeDomRoot(mount);
      }
    });
  });
});
