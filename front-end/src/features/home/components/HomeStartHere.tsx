import * as React from "react";
import { Link } from "react-router";
import type { ArticleSummary } from "@/features/articles/articles-sidebar";
import { fetchHomeArticlesAsync } from "../lib/home-articles";

/**
 * Small curated set of the site's strongest, most representative articles,
 * shown as entry points in order. These are the honest reading list for a
 * site with no newsletter or shop yet.
 */
export const HOME_START_HERE_SLUGS: readonly string[] = [
  "introduction",
  "my-operating-system-is-a-container-image-yes-really",
  "yoga-nidra-a-way-to-be-at-peace-in-chaos",
  "making-my-work-easier-with-notes-in-obsidian",
];

/**
 * Resolve a curated set of articles, preserving the stated slug order and
 * skipping slugs that do not exist in the real content.
 */
export function resolveStartHere(
  articles: ArticleSummary[],
  slugOrder: readonly string[] = HOME_START_HERE_SLUGS,
): ArticleSummary[] {
  const bySlug = new Map(articles.map((article) => [article.slug, article]));
  const ordered: ArticleSummary[] = [];

  for (const slug of slugOrder) {
    const article = bySlug.get(slug);
    if (article !== undefined) {
      ordered.push(article);
    }
  }

  return ordered;
}

/** A vertical list of curated entry-point article links. */
export function StartHereLinks({ items }: { items: ArticleSummary[] }): React.JSX.Element {
  return (
    <ol className="flex flex-col items-center gap-3">
      {items.map((item, index) => (
        <li key={item.slug}>
          <Link
            to={`/articles/${item.slug}`}
            className="flex w-full items-center gap-3 rounded-full border border-white/15 bg-(--site-section-well-bg) px-5 py-2.5 text-(--adw-dark-5) dark:text-white/85 text-base"
          >
            <span aria-hidden="true" className="text-(--adw-dark-5)/50 dark:text-white/50">
              {index + 1}.
            </span>
            {item.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}

interface HomeStartHereProps {
  sectionId: string;
  headingId: string;
  heading: string;
  body: string;
  bgColor: string;
}

/** Home 'secondary-cta' section: a 'Start here' reading list of real articles. */
export function HomeStartHere({
  sectionId,
  headingId,
  heading,
  body,
  bgColor,
}: HomeStartHereProps): React.JSX.Element {
  const [items, setItems] = React.useState<ArticleSummary[] | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadStartHere(): Promise<void> {
      try {
        const articles = await fetchHomeArticlesAsync();
        if (!cancelled) {
          setItems(resolveStartHere(articles));
        }
      } catch {
        if (!cancelled) {
          setItems([]);
        }
      }
    }

    void loadStartHere();
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
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 md:max-w-3xl lg:max-w-296">
          <div className="flex flex-1 flex-col items-center gap-4">
            <h2
              id={headingId}
              className="text-center font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]"
            >
              {heading}
            </h2>
            <p className="max-w-[65ch] text-center text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
              {body}
            </p>
          </div>
          {items === null ? (
            <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">
              Loading reading list...
            </p>
          ) : (
            <StartHereLinks items={items} />
          )}
        </div>
      </div>
    </section>
  );
}