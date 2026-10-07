import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { MemoryRouter } from "react-router";

import type { ArticleData } from "shared/articles";

import { HomeRecommendations } from "../../../../../../front-end/src/features/home/components/home-recommendations";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeRecommendationsSection } from "../../../../../../front-end/src/features/home/types/home-section";
import type { ContentLoader } from "../../../../../../front-end/src/shared/lib/content-loader";
import { createMemoryContentLoader } from "../../../../../../front-end/src/shared/lib/content-loader";
import type { FakeMount } from "../../../../src/test/dom-harness";
import { initFakeDomHarness, mountIntoBody, settleMicrotasks, unmountFakeDomRoot } from "../../../../src/test/dom-harness";
import { queryFakeElements, uninstallFakeDom } from "../../../../src/test/fake-dom";

beforeAll(async () => {
  await initFakeDomHarness();
});

afterAll(() => {
  uninstallFakeDom();
});

function article(slug: string, date: string): ArticleData {
  return {
    title: slug,
    slug,
    date,
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    homeRecommended: false,
    category: "Linux",
    description: `About ${slug}.`,
    body: "",
  };
}

const FOR_YOU_SECTION = HOME_SECTIONS.find(
  (section): section is HomeRecommendationsSection => section.variant === "recommendations",
);

function mountRecommendations(loader: ContentLoader): FakeMount {
  if (FOR_YOU_SECTION === undefined) {
    throw new Error("Expected a recommendations home section");
  }

  return mountIntoBody(
    createElement(MemoryRouter, null, createElement(HomeRecommendations, { section: FOR_YOU_SECTION, loader })),
  );
}

function headings(mount: FakeMount, nodeName: string): string[] {
  return queryFakeElements(mount.container, (el) => el.nodeName === nodeName).map((el) => el.textContent);
}

describe("HomeRecommendations", () => {
  test("shows a loading note, then three recommended article cards", async () => {
    const mount = mountRecommendations(createMemoryContentLoader([
      article("one", "2025-01-01"),
      article("two", "2025-02-01"),
      article("three", "2025-03-01"),
      article("four", "2025-04-01"),
    ]));

    try {
      expect(mount.container.textContent).toContain("Loading recommendations...");

      await act(async () => {
        await settleMicrotasks();
      });

      expect(mount.container.textContent).not.toContain("Loading recommendations...");
      expect(headings(mount, "H2")).toEqual(["For you"]);
      expect(headings(mount, "H3")).toHaveLength(3);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("shows an error note when the articles cannot be loaded", async () => {
    const mount = mountRecommendations({
      ...createMemoryContentLoader([]),
      listArticles: () => Promise.reject(new Error("offline")),
    });

    try {
      await act(async () => {
        await settleMicrotasks();
      });

      expect(mount.container.textContent).toContain("Recommendations could not be loaded right now.");
      expect(headings(mount, "H3")).toEqual([]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
