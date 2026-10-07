import type { JSX } from "react";
import { useCallback } from "react";

import type { ArticleSummary } from "shared/articles";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

import { headingIdFor } from "../config/home-sections";
import { resolveRecommendedPool, selectRecommendedArticles } from "../lib/recommended-articles";
import type { HomeRecommendationsSection } from "../types/home-section";

import { HomeSectionHeading } from "./home-section-heading";
import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";
import { RecommendedArticleCard } from "./recommended-article-card";

/** The slot below the heading: loading note, error note, or the card grid. */
function RecommendationsContent({
  articles,
  loadError,
}: {
  articles: ArticleSummary[] | null;
  loadError: boolean;
}): JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-red-400">
        Recommendations could not be loaded right now. Please try again later.
      </p>
    );
  }

  if (articles === null) {
    return <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">Loading recommendations...</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-x-4 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6">
      {articles.map((article, index) => (
        // Like Kent's layout, the third card only shows once three columns fit.
        <li key={article.slug} className={index >= 2 ? "hidden lg:block" : undefined}>
          <RecommendedArticleCard article={article} />
        </li>
      ))}
    </ul>
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
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 md:max-w-3xl lg:max-w-296 lg:gap-12">
        <HomeSectionHeading
          headingId={headingIdFor(section.id)}
          heading={section.heading}
          subheading={section.body}
          linkLabel={section.linkLabel}
          linkTo={section.linkTo}
        />
        <RecommendationsContent articles={articles} loadError={status === "error"} />
      </div>
    </HomeSectionFrame>
  );
}
