import * as React from "react";
import { Link } from "react-router";
import type { ArticleSummary } from "shared/articles";
import { httpContentLoader, type ContentLoader } from "@/shared/lib/content-loader";
import { HomeSectionShell } from "./home-section-shell";
import type { HomeSectionDefinition } from "../types/home-section";

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

/** The content slot below the section heading: loading, error note, or list. */
export function StartHereContent({
  items,
  loadError,
}: {
  items: ArticleSummary[] | null;
  loadError: boolean;
}): React.JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-center text-sm text-red-600 dark:text-red-400">
        The reading list could not be loaded right now. Please try again later.
      </p>
    );
  }

  if (items === null) {
    return <p className="text-center text-sm text-(--adw-dark-5)/60 dark:text-white/60">Loading reading list...</p>;
  }

  return <StartHereLinks items={items} />;
}

interface HomeStartHereProps {
  section: HomeSectionDefinition;
  loader?: ContentLoader;
}

/** Home 'secondary-cta' section: a 'Start here' reading list of real articles. */
export function HomeStartHere({
  section,
  loader = httpContentLoader,
}: HomeStartHereProps): React.JSX.Element {
  const [items, setItems] = React.useState<ArticleSummary[] | null>(null);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    loader.listArticles().then(
      (articles) => {
        if (!cancelled) {
          setItems(resolveStartHere(articles));
        }
      },
      () => {
        if (!cancelled) {
          setLoadError(true);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [loader]);

  return (
    <HomeSectionShell section={section} heading={section.heading} body={section.body} centered>
      <StartHereContent items={items} loadError={loadError} />
    </HomeSectionShell>
  );
}