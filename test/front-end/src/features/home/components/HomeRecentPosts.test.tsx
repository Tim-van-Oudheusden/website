import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { act, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";

import type { ArticleSummary } from "shared/articles";

import { HomeRecentPosts, RecentPostsContent, RecentPostsList, selectRecentPosts } from "../../../../../../front-end/src/features/home/components/home-recent-posts";
import { HOME_SECTIONS } from "../../../../../../front-end/src/features/home/config/home-sections";
import type { HomeRecentPostsSection } from "../../../../../../front-end/src/features/home/types/home-section";
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

const FIXTURE_POSTS: ArticleSummary[] = [
  {
    title: "Apt-get out of my life, hello flatpak",
    slug: "apt-get-out-of-my-life-hello-flatpak",
    date: "2026-01-10",
    tags: ["Linux"],
    type: "article",
    socialImage: null,
    draft: false,
    category: "Linux",
    description: "Leaving flatpak behind for apt.",
  },
  {
    title: "Introduction",
    slug: "introduction",
    date: "2026-02-20",
    tags: [],
    type: "article",
    socialImage: null,
    draft: false,
    category: "Introduction",
    description: "What this site is about.",
  },
  {
    title: "Yoga Nidra",
    slug: "yoga-nidra-a-way-to-be-at-peace-in-chaos",
    date: "2026-03-15",
    tags: ["Personal Life"],
    type: "article",
    socialImage: null,
    draft: false,
    category: "Personal Life",
    description: "Rest at peace.",
  },
];

function renderPostsList(posts: ArticleSummary[]): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(RecentPostsList, { posts })),
  );
}

function renderContent(posts: ArticleSummary[] | null, loadError: boolean): string {
  return renderToStaticMarkup(
    createElement(MemoryRouter, null, createElement(RecentPostsContent, { posts, loadError })),
  );
}

const RECENT_POSTS_SECTION = HOME_SECTIONS.find(
  (section): section is HomeRecentPostsSection => section.variant === "recent-posts",
);

async function mountRecentPosts(loader: ContentLoader): Promise<FakeMount> {
  if (RECENT_POSTS_SECTION === undefined) {
    throw new Error("Expected a whats-new home section");
  }

  const mount = mountIntoBody(
    createElement(MemoryRouter, null, createElement(HomeRecentPosts, { section: RECENT_POSTS_SECTION, loader })),
  );

  await act(async () => {
    await settleMicrotasks();
  });

  return mount;
}

describe("selectRecentPosts", () => {
  test("sorts newest-first by date", () => {
    const result = selectRecentPosts(FIXTURE_POSTS);

    expect(result[0]?.slug).toBe("yoga-nidra-a-way-to-be-at-peace-in-chaos");
    expect(result[1]?.slug).toBe("introduction");
    expect(result[2]?.slug).toBe("apt-get-out-of-my-life-hello-flatpak");
  });

  test("limits the slice to a small set", () => {
    expect(selectRecentPosts(FIXTURE_POSTS, 2)).toHaveLength(2);
  });

  test("does not mutate the input array", () => {
    const input = [...FIXTURE_POSTS];

    selectRecentPosts(input);
    expect(input[0]?.slug).toBe("apt-get-out-of-my-life-hello-flatpak");
  });

  test("orders same-day posts by title before falling back to slug", () => {
    const sameDay: ArticleSummary = {
      title: "",
      slug: "",
      date: "2026-04-01",
      tags: [],
      type: "article",
      socialImage: null,
      draft: false,
      category: "Linux",
      description: "Same-day post.",
    };
    const result = selectRecentPosts([
      { ...sameDay, title: "Zebra crossings", slug: "a-zebra" },
      { ...sameDay, title: "Alpine mornings", slug: "z-alpine" },
      { ...sameDay, title: "Alpine mornings", slug: "m-alpine" },
    ]);

    expect(result.map((post) => post.slug)).toEqual(["m-alpine", "z-alpine", "a-zebra"]);
  });
});

describe("RecentPostsList", () => {
  test("renders the most recent post titles as links to their article pages", () => {
    const html = renderPostsList(selectRecentPosts(FIXTURE_POSTS));

    expect(html).toContain("/articles/yoga-nidra-a-way-to-be-at-peace-in-chaos");
    expect(html).toContain("/articles/introduction");
    expect(html).toContain("Yoga Nidra");
    expect(html).toContain("Introduction");
  });

  test("renders each post as an anchor, not a fabricated channel", () => {
    const html = renderPostsList(FIXTURE_POSTS);

    expect(html).toContain("<a");
    expect(html).not.toContain("discord");
    expect(html).not.toContain("release-notes");
    expect(html).not.toMatch(/\/docs/i);
  });
});

describe("RecentPostsContent", () => {
  test("renders an error note instead of an empty list when the loader rejects", () => {
    const html = renderContent(null, true);

    expect(html).toContain('role="alert"');
    expect(html).toContain("Recent posts could not be loaded right now.");
    expect(html).not.toContain("<ul");
    expect(html).not.toContain("Loading recent posts");
  });

  test("renders the loading prompt before the first resolve", () => {
    const html = renderContent(null, false);

    expect(html).toContain("Loading recent posts...");
    expect(html).not.toContain("role=\"alert\"");
  });

  test("renders an empty list without an error for a successful empty result", () => {
    const html = renderContent([], false);

    expect(html).toContain("<ul");
    expect(html).not.toContain("role=\"alert\"");
  });
});

describe("HomeRecentPosts", () => {
  test("links the loader's newest posts, newest first", async () => {
    const mount = await mountRecentPosts(
      createMemoryContentLoader(FIXTURE_POSTS.map((post) => ({ ...post, body: "" }))),
    );

    try {
      const hrefs = queryFakeElements(mount.container, (el) => el.nodeName === "A").map((el) => el.getAttribute("href"));

      expect(hrefs).toEqual([
        "/articles/yoga-nidra-a-way-to-be-at-peace-in-chaos",
        "/articles/introduction",
        "/articles/apt-get-out-of-my-life-hello-flatpak",
      ]);

      expect(mount.container.textContent).not.toContain("Loading recent posts...");
    } finally {
      unmountFakeDomRoot(mount);
    }
  });

  test("shows the error note when the loader rejects", async () => {
    const mount = await mountRecentPosts({
      ...createMemoryContentLoader([]),
      listArticles: () => Promise.reject(new Error("offline")),
    });

    try {
      expect(mount.container.textContent).toContain("Recent posts could not be loaded right now.");
      expect(queryFakeElements(mount.container, (el) => el.nodeName === "A")).toEqual([]);
    } finally {
      unmountFakeDomRoot(mount);
    }
  });
});
