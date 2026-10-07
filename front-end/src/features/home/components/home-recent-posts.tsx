import type { JSX } from "react";
import { useCallback } from "react";
import { Link } from "react-router";

import type { ArticleSummary } from "shared/articles";
import { compareArticles } from "shared/articles";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

import type { HomeRecentPostsSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

export const RECENT_POSTS_COUNT = 4;

/** Pick the N most recent articles, newest first. */
export function selectRecentPosts(
  posts: ArticleSummary[],
  count: number = RECENT_POSTS_COUNT,
): ArticleSummary[] {
  return [...posts].sort(compareArticles).slice(0, count);
}

/** A compact grid of recent posts, each linked to its real article page. */
export function RecentPostsList({ posts }: { posts: ArticleSummary[] }): JSX.Element {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            to={`/articles/${post.slug}`}
            className="group flex flex-col gap-2 rounded-xl border border-white/15 bg-(--site-section-well-bg) px-5 py-4"
          >
            <span className="font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1)">
              {post.title}
            </span>
            <span className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">
              {post.description}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The content slot below the section heading: loading, error note, or list. */
export function RecentPostsContent({
  posts,
  loadError,
}: {
  posts: ArticleSummary[] | null;
  loadError: boolean;
}): JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Recent posts could not be loaded right now. Please try again later.
      </p>
    );
  }

  if (posts === null) {
    return <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">Loading recent posts...</p>;
  }

  return <RecentPostsList posts={posts} />;
}

interface HomeRecentPostsProps {
  section: HomeRecentPostsSection;
  loader: ContentLoader;
}

/** Home 'whats-new' section: a self-updating recent-posts strip from real content. */
export function HomeRecentPosts({ section, loader }: HomeRecentPostsProps): JSX.Element {
  const load = useCallback(async () => selectRecentPosts(await loader.listArticles()), [loader]);
  const { status, data: posts } = useLoadOnMount(load, "Failed to load recent posts");

  return (
    <HomeHeadedSectionShell
      as="section"
      section={section}
      heading={section.heading}
      body={section.body}
    >
      <RecentPostsContent posts={posts} loadError={status === "error"} />
    </HomeHeadedSectionShell>
  );
}
