import * as React from "react";
import { useEffect } from "react";
import { useParams } from "react-router";
import { useArticles } from "../hooks/use-articles";
import { useArticleToc } from "../hooks/use-article-toc";
import { navigateToArticleHeadingById } from "../lib/article-toc";
import { resolveArticlesTrailTargetSlug } from "../lib/articles-sidebar";
import { ArticlesSidebar } from "../components/articles-sidebar";
import { ArticleContent } from "../components/article-content";
import { ARTICLES_PAGE_LAYOUT_CLASSES, ARTICLES_PAGE_TYPOGRAPHY_CLASSES } from "../lib/articles-page-styles";

export function ArticlesPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const {
    articles,
    selectedSlug,
    selectedArticle,
    loadingArticles,
    loadingArticle,
    listError,
    articleError,
    selectSlug,
  } = useArticles(slug);
  const { tocItems, visibleTocHeadingIds } = useArticleToc(selectedArticle, loadingArticle);

  useEffect(() => {
    if (selectedArticle === null) {
      return;
    }

    const hash = window.location.hash;
    if (hash.length <= 1) {
      return;
    }

    const headingId = decodeURIComponent(hash.slice(1));
    const frameId = window.requestAnimationFrame(() => {
      navigateToArticleHeadingById(headingId);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [selectedArticle]);

  if (loadingArticles) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-muted-foreground">Loading articles...</p>
      </main>
    );
  }

  if (listError !== null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-destructive">{listError}</p>
      </main>
    );
  }

  if (articles.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--adw-page-brown-bg) p-4">
        <h1 className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle}>Articles</h1>
        <p className="text-muted-foreground">No articles yet.</p>
      </main>
    );
  }

  const trailTargetSlug = resolveArticlesTrailTargetSlug(articles);

  return (
    <main className={ARTICLES_PAGE_LAYOUT_CLASSES.container}>
      <ArticlesSidebar articles={articles} selectedSlug={selectedSlug} />
      <ArticleContent
        article={selectedArticle}
        loading={loadingArticle}
        error={articleError}
        tocItems={tocItems}
        visibleTocHeadingIds={visibleTocHeadingIds}
        onArticlesActivate={() => {
          if (trailTargetSlug !== null) {
            selectSlug(trailTargetSlug);
          }
        }}
      />
    </main>
  );
}