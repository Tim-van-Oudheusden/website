import * as React from "react";
import { Link } from "react-router";
import type { ArticleSummary } from "@/features/articles/lib/articles-sidebar";
import { sortArticleSummariesDesc, fetchHomeArticlesAsync } from "../lib/home-articles";

export const RECENT_POSTS_COUNT = 4;

/** Pick the N most recent non-empty articles, newest first. */
export function selectRecentPosts(
  posts: ArticleSummary[],
  count: number = RECENT_POSTS_COUNT,
): ArticleSummary[] {
  return sortArticleSummariesDesc(posts).slice(0, count);
}

/** A compact grid of recent posts, each linked to its real article page. */
export function RecentPostsList({ posts }: { posts: ArticleSummary[] }): React.JSX.Element {
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

interface HomeRecentPostsProps {
  sectionId: string;
  headingId: string;
  heading: string;
  body: string;
  bgColor: string;
}

/** Home 'community-and-docs' section: a self-updating recent-posts strip from real content. */
export function HomeRecentPosts({
  sectionId,
  headingId,
  heading,
  body,
  bgColor,
}: HomeRecentPostsProps): React.JSX.Element {
  const [posts, setPosts] = React.useState<ArticleSummary[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadPosts(): Promise<void> {
      try {
        const articles = await fetchHomeArticlesAsync();
        if (!cancelled) {
          setPosts(selectRecentPosts(articles));
        }
      } catch {
        if (!cancelled) {
          setPosts([]);
        }
      }
    }

    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296">
          <div className="flex flex-1 flex-col gap-5">
            <h2
              id={headingId}
              className="font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]"
            >
              {heading}
            </h2>
            <p className="max-w-[65ch] text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
              {body}
            </p>
          </div>
          {posts === null ? (
            <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">
              Loading recent posts...
            </p>
          ) : (
            <RecentPostsList posts={posts} />
          )}
        </div>
      </div>
    </section>
  );
}