import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type * as CollapsibleModule from "../../../../../../front-end/src/shared/components/ui/collapsible";
import { initFakeDomHarness } from "../../../../src/test/dom-harness";
import { uninstallFakeDom } from "../../../../src/test/fake-dom";

// Module-loading boundary: Radix captures `globalThis?.document` at module
// load, so it must be imported after the fake DOM is installed by the harness.
let Collapsible: typeof CollapsibleModule.Collapsible;
let CollapsibleContent: typeof CollapsibleModule.CollapsibleContent;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod: typeof CollapsibleModule = await import(
    "../../../../../../front-end/src/shared/components/ui/collapsible"
  );

  Collapsible = mod.Collapsible;
  CollapsibleContent = mod.CollapsibleContent;
});

afterAll(() => {
  uninstallFakeDom();
});

function contentClasses(): string[] {
  const html = renderToStaticMarkup(
    createElement(Collapsible, { defaultOpen: true }, createElement(CollapsibleContent, { className: "space-y-1 pt-1" }, "Body")),
  );

  return (/<div [^>]*data-slot="collapsible-content"[^>]*>/.exec(html)?.[0].match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
}

describe("CollapsibleContent", () => {
  test("opens and closes over Radix's measured height, clipped, and keeps the caller's classes", () => {
    const classes = contentClasses();

    expect(classes).toEqual(expect.arrayContaining([
      "overflow-hidden",
      "motion-safe:data-[state=open]:animate-collapsible-down",
      "motion-safe:data-[state=closed]:animate-collapsible-up",
      "space-y-1",
      "pt-1",
    ]));
  });

  test("animates only without a reduced-motion preference", () => {
    const animations = contentClasses().filter((token) => token.includes("animate-"));

    expect(animations).not.toBeEmpty();
    expect(animations.filter((token) => !token.startsWith("motion-safe:"))).toEqual([]);
  });
});
