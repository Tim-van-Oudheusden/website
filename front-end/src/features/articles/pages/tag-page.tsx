import type { JSX } from "react";
import { Link, useParams } from "react-router";

import type { ArticleSummary } from "shared/articles";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { httpContentLoader } from "@/shared/lib/content-loader";

import { formatArticleDate } from "../lib/article-date";
import { selectArticlesByTag, tagSlug } from "../lib/article-tags";
import { ARTICLES_PAGE_LAYOUT_CLASSES, ARTICLES_PAGE_TYPOGRAPHY_CLASSES } from "../lib/articles-page-styles";

function loadArticles(): Promise<ArticleSummary[]> {
  return httpContentLoader.listArticles();
}

/** `/tags/:tag`: every published article carrying the tag, newest first. */
export function TagPage(): JSX.Element {
  const { tag = "" } = useParams<{ tag: string }>();
  const list = useLoadOnMount(loadArticles, "Failed to load articles");

  if (list.data === null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--site-page-bg) p-4">
        <h1 className="sr-only">{`Articles tagged ${tag}`}</h1>
        {list.error === null
          ? <p className="text-muted-foreground">Loading articles...</p>
          : <p className="text-destructive">{list.error}</p>}
      </main>
    );
  }

  const tagged = selectArticlesByTag(list.data, tag);
  // Show the tag as authored ("Content API"), not as its URL slug.
  const tagName = tagged[0]?.tags.find((articleTag) => tagSlug(articleTag) === tagSlug(tag)) ?? tag;

  return (
    <main className={ARTICLES_PAGE_LAYOUT_CLASSES.container}>
      <div className={ARTICLES_PAGE_LAYOUT_CLASSES.content}>
        <div className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.articleBodyMeasure}>
          <h1 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle}>{`Articles tagged ${tagName}`}</h1>
          {tagged.length === 0
            ? (
                <div className="mt-6 space-y-3">
                  <p className="text-muted-foreground">{`No articles are tagged ${tagName} yet.`}</p>
                  <Link to="/articles" className="font-medium underline underline-offset-4">Browse all articles</Link>
                </div>
              )
            : (
                <ul className="mt-6 space-y-3">
                  {tagged.map((article) => (
                    <li key={article.slug}>
                      <Link to={`/articles/${article.slug}`} className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.relatedLink}>
                        <span className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.relatedLinkTitle}>{article.title}</span>
                        <span className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.relatedLinkDescription}>{article.description}</span>
                        <time dateTime={article.date} className="text-muted-foreground text-xs">
                          {formatArticleDate(article.date)}
                        </time>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      </div>
    </main>
  );
}
