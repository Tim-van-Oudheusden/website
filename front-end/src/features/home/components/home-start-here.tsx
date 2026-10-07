import type { JSX } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import type { ArticleSummary } from "shared/articles";

import type { ContentLoader } from "@/shared/lib/content-loader";

import { resolveCuratedArticles } from "../lib/recommended-articles";
import type { HomeStartHereSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

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

/** A vertical list of curated entry-point article links. */
export function StartHereLinks({ items }: { items: ArticleSummary[] }): JSX.Element {
  return (
    <ol className="flex flex-col items-center gap-3">
      {items.map((item, index) => (
        <li key={item.slug}>
          <Link
            to={`/articles/${item.slug}`}
            className="flex w-full items-center gap-3 rounded-full border border-white/15 bg-(--site-section-well-bg) px-5 py-2.5 text-(--adw-dark-5) dark:text-white/85 text-base"
          >
            <span aria-hidden="true" className="text-(--adw-dark-5)/50 dark:text-white/50">
              {index + 1}
              .
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
}): JSX.Element {
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
  section: HomeStartHereSection;
  loader: ContentLoader;
}

/** Home 'secondary-cta' section: a 'Start here' reading list of real articles. */
export function HomeStartHere({ section, loader }: HomeStartHereProps): JSX.Element {
  const [items, setItems] = useState<ArticleSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loader.listArticles().then(
      (articles) => {
        if (!cancelled) {
          setItems(resolveCuratedArticles(articles, HOME_START_HERE_SLUGS));
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
    <HomeHeadedSectionShell as="section" section={section} heading={section.heading} body={section.body} centered>
      <StartHereContent items={items} loadError={loadError} />
    </HomeHeadedSectionShell>
  );
}
