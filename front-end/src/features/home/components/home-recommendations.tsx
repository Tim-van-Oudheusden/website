import type { JSX } from "react";
import { useEffect, useState } from "react";

import type { ArticleSummary } from "shared/articles";

import type { ContentLoader } from "@/shared/lib/content-loader";

import { headingIdFor } from "../config/home-sections";
import { HOME_RECOMMENDED_SLUGS, selectRecommendedArticles } from "../lib/recommended-articles";
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
  const [articles, setArticles] = useState<ArticleSummary[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loader.listArticles().then(
      (loaded) => {
        if (!cancelled) {
          setArticles(selectRecommendedArticles(loaded, HOME_RECOMMENDED_SLUGS, Math.random));
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
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 md:max-w-3xl lg:max-w-296 lg:gap-12">
        <HomeSectionHeading
          headingId={headingIdFor(section.id)}
          heading={section.heading}
          subheading={section.body}
          linkLabel={section.linkLabel}
          linkTo={section.linkTo}
        />
        <RecommendationsContent articles={articles} loadError={loadError} />
      </div>
    </HomeSectionFrame>
  );
}
