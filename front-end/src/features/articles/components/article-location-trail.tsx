import { House } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";

interface ArticleLocationTrailProps {
  articleTitle: string;
  onArticlesActivate: () => void;
}

export function ArticleLocationTrail({
  articleTitle,
  onArticlesActivate,
}: ArticleLocationTrailProps): JSX.Element | null {
  if (!articleTitle) {
    return null;
  }

  return (
    <nav
      aria-label="Current location"
      className="text-muted-foreground mb-4 flex items-center gap-2 text-sm"
    >
      {/* 14px padding grows the 16px icon to a 44px hit area;
          the matching negative margin keeps the trail where it was. */}
      <Link to="/" aria-label="Home" className="-m-3.5 p-3.5">
        <House className="size-4" />
      </Link>
      <span aria-hidden="true">&gt;</span>
      <button
        type="button"
        onClick={onArticlesActivate}
        className="cursor-pointer font-medium hover:text-foreground transition-colors"
      >
        Articles
      </button>
      <span aria-hidden="true">&gt;</span>
      <span className="text-foreground truncate font-medium">{articleTitle}</span>
    </nav>
  );
}
