import { afterAll, afterEach, beforeAll, describe, expect, mock, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { HiveMetricsResponse } from "shared";

import { AgenticPage } from "../../../../../../front-end/src/features/agentic/pages/agentic-page";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, jsonResponse, mountIntoBody, routeFetch, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import type { FakeElement } from "../../../../src/test/fake-dom";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

const ORIGINAL_FETCH = globalThis.fetch;

beforeAll(async () => {
  await initFakeDomHarness();
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

afterAll(() => {
  uninstallFakeDom();
});

function mountPage(): FakeMount {
  // The rim's project list never settles here; these tests are about the strata.
  globalThis.fetch = mock(() => new Promise<Response>(() => undefined)) as unknown as typeof globalThis.fetch;

  return mountIntoBody(createElement(MemoryRouter, null, createElement(AgenticPage)));
}

function byName(root: FakeElement, nodeName: string): FakeElement[] {
  return queryFakeElements(root, (el) => el.nodeName === nodeName);
}

/** The strata: every section headed by one h2, except the live metrics section that follows them. */
function strataSections(page: FakeMount): FakeElement[] {
  return byName(page.container, "SECTION")
    .filter((section) => byName(section, "H2").length === 1 && section.getAttribute("id") !== "metrics");
}

describe("AgenticPage strata", () => {
  test("lists the six strata as h2 headings in rim-to-bedrock order, then the metrics heading", () => {
    const page = mountPage();

    try {
      expect(byName(page.container, "H2").map((h2) => h2.textContent)).toEqual([
        "Content",
        "Interface",
        "API",
        "Quality",
        "Delivery",
        "Agents · Hive",
        "The hive, live",
      ]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("gives every stratum a unique deep-link id, a sentence and its pillars as a list", () => {
    const page = mountPage();

    try {
      const sections = strataSections(page);
      const ids = sections.map((section) => section.getAttribute("id"));

      expect(sections).toHaveLength(6);
      expect(ids).toContain("quality");
      expect(new Set(ids).size).toBe(6);

      for (const section of sections) {
        expect(section.getAttribute("id")).toMatch(/^[a-z][a-z-]*$/);
        expect(byName(section, "P").some((p) => p.textContent.trim().length > 0)).toBe(true);

        const pillars = byName(section, "UL").flatMap((list) => byName(list, "LI")).filter((li) => byName(li, "A").length === 0);

        expect(pillars.length).toBeGreaterThan(0);
      }
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("names the real tools as pillars", () => {
    const page = mountPage();

    try {
      const textById = new Map(strataSections(page).map((section) => [section.getAttribute("id"), section.textContent]));

      expect(textById.get("interface")).toContain("React 19");
      expect(textById.get("quality")).toContain("Stryker");
      expect(textById.get("delivery")).toContain("Cloudflare Tunnel");
      expect(textById.get("agents-hive")).toContain("Dependabot");
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("links every stratum to its sources in the repository on GitHub", () => {
    const page = mountPage();

    try {
      const sections = strataSections(page);

      expect(sections).toHaveLength(6);

      for (const section of sections) {
        const sources = queryFakeElements(section, (el) => el.getAttribute("aria-label")?.startsWith("Sources for ") === true);
        const hrefs = sources.flatMap((list) => byName(list, "A")).map((a) => a.getAttribute("href"));

        expect(hrefs.length).toBeGreaterThan(0);

        for (const href of hrefs) {
          expect(href).toStartWith("https://github.com/Tim-van-Oudheusden/website/");
        }
      }
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("hands off from the Agents · Hive card to the live metrics, and only from that card", () => {
    const page = mountPage();

    try {
      const handOffs = strataSections(page).flatMap((section) => byName(section, "A")
        .filter((a) => a.getAttribute("href")?.startsWith("#") === true)
        .map((a) => [section.getAttribute("id"), a.getAttribute("href"), a.textContent]));

      expect(handOffs).toEqual([["agents-hive", "#metrics", "This layer is live ↓"]]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("puts the rim with the project links above the first stratum", async () => {
    globalThis.fetch = mock(() => Promise.resolve(jsonResponse([{ slug: "minimal-android-launcher", title: "Minimal Android Launcher", type: "project" }]))) as unknown as typeof globalThis.fetch;
    const page = mountIntoBody(createElement(MemoryRouter, null, createElement(AgenticPage)));

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      const text = page.container.textContent;

      expect(byName(page.container, "A")[0]?.getAttribute("href")).toBe("/projects/minimal-android-launcher");
      expect(text.indexOf("Minimal Android Launcher")).toBeLessThan(text.indexOf("Content"));
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("ends with the live Hive metrics section, polled from the metrics route, after the strata", async () => {
    const requested = routeFetch({
      "/api/hive/metrics": () => Promise.resolve(jsonResponse({
        state: "unavailable",
        fetchedAt: null,
        metrics: null,
      } satisfies HiveMetricsResponse)),
    });
    const page = mountIntoBody(createElement(MemoryRouter, null, createElement(AgenticPage)));

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      const metrics = byName(page.container, "SECTION").find((section) => section.getAttribute("id") === "metrics");

      expect(requested).toContain("/api/hive/metrics");
      expect(byName(page.container, "H2").map((h2) => h2.textContent).at(-1)).toBe("The hive, live");
      expect(metrics?.textContent).toContain("The live numbers are not available right now");
    } finally {
      unmountFakeDomRoot(page);
    }
  });
});

/** Lets the lazily loaded scene module arrive and render. */
async function settleScene(): Promise<void> {
  await act(async () => {
    await settleMicrotasks();

    const { promise, resolve } = Promise.withResolvers<undefined>();

    setTimeout(resolve, 50);
    await promise;
    await settleMicrotasks();
  });
}

/** `data-revealed` of each tablet the scene drew, rim first. */
function tabletStates(page: FakeMount): (string | null)[] {
  return queryFakeElements(page.container, (el) => el.getAttribute("data-tablet") !== null)
    .map((tablet) => tablet.getAttribute("data-revealed"));
}

interface MediaWindow {
  matchMedia: (query: string) => unknown;
}

describe("AgenticPage canyon", () => {
  test("starts with no stratum revealed: the scene follows scrolling from the top of the track", async () => {
    const page = mountPage();

    try {
      const track = byName(page.container, "SECTION").find((section) => section.getAttribute("aria-label") === "How this site is built");

      if (track === undefined) {
        throw new Error("No canyon track on the page");
      }

      // A track taller than the viewport, its top at the viewport top: nothing scrolled yet.
      track.rect = { width: 1280, height: 5600 };
      await settleScene();

      expect(tabletStates(page)).toEqual(["false", "false", "false", "false", "false", "false"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("with reduced motion, shows one static frame with every stratum revealed", async () => {
    const mediaWindow = window as unknown as MediaWindow;
    const original = mediaWindow.matchMedia;

    mediaWindow.matchMedia = (query) => ({
      ...(original(query) as object),
      matches: query === "(prefers-reduced-motion: reduce)",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });

    try {
      const page = mountPage();

      try {
        await settleScene();

        expect(tabletStates(page)).toEqual(["true", "true", "true", "true", "true", "true"]);
      } finally {
        unmountFakeDomRoot(page);
      }
    } finally {
      mediaWindow.matchMedia = original;
    }
  });

  test("marks the cards of strata the water has passed, so phones can clear them from above the scene", async () => {
    const page = mountPage();

    try {
      const track = byName(page.container, "SECTION").find((section) => section.getAttribute("aria-label") === "How this site is built");

      if (track === undefined) {
        throw new Error("No canyon track on the page");
      }

      // 60 % of the way down a 5,600 px track: four strata revealed, Quality the latest.
      const top = -0.6 * (5600 - window.innerHeight);

      track.getBoundingClientRect = () => ({
        left: 0, top, right: 1280, bottom: top + 5600, width: 1280, height: 5600, x: 0, y: top,
      });

      await settleScene();

      const passed = queryFakeElements(track, (el) => el.getAttribute("data-passed") !== null)
        .map((slot) => slot.getAttribute("data-passed"));

      // Behind: the rim, Content, Interface, API. Current: Quality. Ahead: Delivery, Agents · Hive.
      expect(passed).toEqual(["true", "true", "true", "true", "false", "false", "false"]);
    } finally {
      unmountFakeDomRoot(page);
    }
  });

  test("jumps to a deep-linked stratum once the page has rendered", () => {
    window.location.hash = "#quality";

    try {
      const page = mountPage();

      try {
        const quality = strataSections(page).find((section) => section.getAttribute("id") === "quality");

        expect(quality?.scrollIntoViewCalls).toHaveLength(1);
      } finally {
        unmountFakeDomRoot(page);
      }
    } finally {
      window.location.hash = "";
    }
  });
});
