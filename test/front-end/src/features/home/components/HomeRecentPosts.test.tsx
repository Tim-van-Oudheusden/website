import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { renderToStaticMarkup } from "react-dom/server";
import { RecentPostsContent, RecentPostsList, selectRecentPosts } from "../../../../../../front-end/src/features/home/components/home-recent-posts";
import type { ArticleSummary } from "shared/articles";

const FIXTURE_POSTS: ArticleSummary[] = [
  {
    title: "Apt-get out of my life, hello flatpak",
    slug: "apt-get-out-of-my-life-hello-flatpak",
    date: "2026-01-10",
    tags: ["Linux"],
    type: "article",
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