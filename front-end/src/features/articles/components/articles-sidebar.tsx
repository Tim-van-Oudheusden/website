import * as React from "react";
import { useState } from "react";
import { ChevronRight, FileText, Folder } from "lucide-react";
import { Link } from "react-router";
import { ARTICLE_CATEGORIES, type ArticleCategory } from "shared";
import type { ArticleSummary } from "shared/articles";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { groupArticlesByCategory } from "../lib/articles-sidebar";
import {
  ARTICLES_PAGE_LAYOUT_CLASSES,
  ARTICLES_PAGE_TYPOGRAPHY_CLASSES,
} from "../lib/articles-page-styles";

const INITIAL_OPEN_CATEGORIES: Record<ArticleCategory, boolean> = {
  "Introduction": true,
  "Linux": true,
  "Work": true,
  "Personal Life": true,
};

interface ArticlesSidebarProps {
  articles: ArticleSummary[];
  selectedSlug: string | null;
}

/** Category-grouped article list; owns its per-category open/closed state. */
export function ArticlesSidebar({ articles, selectedSlug }: ArticlesSidebarProps): React.JSX.Element {
  const [openCategories, setOpenCategories] = useState<Record<ArticleCategory, boolean>>(INITIAL_OPEN_CATEGORIES);
  const groupedArticles = groupArticlesByCategory(articles);

  return (
    <aside className={ARTICLES_PAGE_LAYOUT_CLASSES.sidebar}>
      <div className="p-3">
        <div className={ARTICLES_PAGE_LAYOUT_CLASSES.panelBox}>
          <h1 className={cn("px-2 pb-2", ARTICLES_PAGE_TYPOGRAPHY_CLASSES.pageTitle)}>Articles</h1>
          <div className="space-y-1">
            {ARTICLE_CATEGORIES.map((category) => {
              const isOpen = openCategories[category];
              const categoryArticles = groupedArticles[category];
              let chevronRotationClass = "rotate-0";

              if (isOpen) {
                chevronRotationClass = "rotate-90";
              }

              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={(open) => {
                    setOpenCategories((current) => ({ ...current, [category]: open }));
                  }}
                >
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-start gap-2 px-2 text-sm font-medium">
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          chevronRotationClass,
                        )}
                      />
                      <Folder className="size-4" />
                      <span className={ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarTriggerLabel}>{category}</span>
                      <span className="text-muted-foreground ml-auto text-xs">
                        {categoryArticles.length}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pt-1 pl-6">
                    {categoryArticles.map((article) => {
                      let articleStateClass = "text-muted-foreground";

                      if (article.slug === selectedSlug) {
                        articleStateClass = ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarSelectedArticleState;
                      }

                      return (
                        <Link
                          key={article.slug}
                          to={`/articles/${article.slug}`}
                          className={cn(
                            ARTICLES_PAGE_TYPOGRAPHY_CLASSES.sidebarArticleButton,
                            articleStateClass,
                          )}
                        >
                          <FileText className="size-4" />
                          <span className="truncate">{article.title}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
