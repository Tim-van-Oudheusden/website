import type { JSX } from "react";
import { useCallback } from "react";

import type { ArticleSummary } from "shared/articles";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

import {
  RECOMMENDED_ARTICLES_COUNT,
  resolveRecommendedPool,
  selectRecommendedArticles,
} from "../lib/recommended-articles";
import type { HomeRecommendationsSection } from "../types/home-section";

import { HomeLoadSlot } from "./home-load-slot";
import { HomeHeadedSectionShell } from "./home-section-shell";
import { RecommendedArticleCard, RecommendedArticleCardSkeleton } from "./recommended-article-card";

const CARD_GRID_CLASSES = "grid grid-cols-1 gap-x-4 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6";

/** Like Kent's layout, the third card only shows once three columns fit. */
function cardItemClasses(index: number): string | undefined {
  return index >= 2 ? "hidden lg:block" : undefined;
}

/** The card grid at its loaded size, a placeholder card per recommendation. */
function RecommendationsSkeleton(): JSX.Element {
  return (
    <ul className={CARD_GRID_CLASSES}>
      {Array.from({ length: RECOMMENDED_ARTICLES_COUNT }, (_, index) => (
        <li key={index} className={cardItemClasses(index)}>
          <RecommendedArticleCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/** The slot below the heading: loading skeleton, error note, or the card grid. */
function RecommendationsContent({
  articles,
  loadError,
}: {
  articles: ArticleSummary[] | null;
  loadError: boolean;
}): JSX.Element {
  return (
    <HomeLoadSlot
      data={articles}
      loadError={loadError}
      errorMessage="Recommendations could not be loaded right now. Please try again later."
      loadingMessage="Loading recommendations..."
      skeleton={<RecommendationsSkeleton />}
    >
      {(loaded) => (
        <ul className={CARD_GRID_CLASSES}>
          {loaded.map((article, index) => (
            <li key={article.slug} className={cardItemClasses(index)}>
              <RecommendedArticleCard article={article} />
            </li>
          ))}
        </ul>
      )}
    </HomeLoadSlot>
  );
}

interface HomeRecommendationsProps {
  section: HomeRecommendationsSection;
  loader: ContentLoader;
}

/** Home 'for-you' section: three articles picked at random from a curated pool on every page load. */
export function HomeRecommendations({ section, loader }: HomeRecommendationsProps): JSX.Element {
  const load = useCallback(
    async () => {
      const articles = await loader.listArticles();

      return selectRecommendedArticles(articles, resolveRecommendedPool(articles), Math.random);
    },
    [loader],
  );
  const { status, data: articles } = useLoadOnMount(load, "Failed to load recommendations");

  return (
    <HomeHeadedSectionShell
      as="section"
      section={section}
      heading={section.heading}
      subheading={section.body}
      link={{ label: section.linkLabel, to: section.linkTo }}
      headingAlign="start"
    >
      <RecommendationsContent articles={articles} loadError={status === "error"} />
    </HomeHeadedSectionShell>
  );
}
