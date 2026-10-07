import { Check, Copy } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router";

import type { ArticleSummary } from "shared/articles";
import { resolveSocialImagePath } from "shared/social-image";

import { Button } from "@/shared/components/ui/button";

import { formatArticleDate } from "../lib/article-date";

type CopyStatus = "idle" | "copied" | "failed";

/** How long "Copied to clipboard" (or the failure note) shows before the label resets. */
const COPY_STATUS_RESET_MS = 2000;

const COPY_LABELS: Record<CopyStatus, string> = {
  idle: "Copy link",
  copied: "Copied to clipboard",
  failed: "Couldn't copy link",
};

const COPY_ANNOUNCEMENTS: Record<CopyStatus, string> = {
  idle: "",
  copied: "Link copied to clipboard",
  failed: "Couldn't copy link",
};

/**
 * Copies the article's absolute URL. Icon-only below `lg`; from `lg` a text pill
 * that appears when the card is hovered or holds focus. The outcome is announced
 * through a polite live region.
 */
function CopyArticleLinkButton({ path }: { path: string }): JSX.Element {
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status === "idle") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStatus("idle");
    }, COPY_STATUS_RESET_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [status]);

  function copyLink(): void {
    // `navigator.clipboard` is missing outside secure contexts: the async chain turns that throw into "failed".
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(new URL(path, window.location.origin).href))
      .then(
        () => {
          setStatus("copied");
        },
        () => {
          setStatus("failed");
        },
      );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={copyLink}
        className="absolute top-6 left-6 z-10 size-12 rounded-lg bg-(--adw-light-1) text-(--adw-dark-5) shadow transition hover:bg-(--adw-light-1) hover:shadow-md dark:bg-(--adw-headerbar-bg-color) dark:text-(--adw-light-1) dark:hover:bg-(--adw-headerbar-bg-color) lg:size-auto lg:px-8 lg:py-4 lg:text-lg lg:opacity-0 lg:group-hover/card:opacity-100 lg:group-focus-within/card:opacity-100 motion-reduce:transition-none"
      >
        {status === "copied" ? <Check aria-hidden="true" className="size-6 lg:hidden" /> : <Copy aria-hidden="true" className="size-6 lg:hidden" />}
        <span className="sr-only lg:not-sr-only">{COPY_LABELS[status]}</span>
      </Button>
      <span aria-live="polite" className="sr-only">{COPY_ANNOUNCEMENTS[status]}</span>
    </>
  );
}

interface RecommendedArticleCardProps {
  article: ArticleSummary;
}

/**
 * One for-you recommendation: the article's social image, then the date and
 * category, then the title. Hover and keyboard focus draw a ring around the
 * image only.
 */
export function RecommendedArticleCard({ article }: RecommendedArticleCardProps): JSX.Element {
  const titleId = useId();
  const metaId = useId();
  const imagePath = resolveSocialImagePath(article.socialImage);

  return (
    <div className="group/card relative">
      <Link
        to={`/articles/${article.slug}`}
        aria-labelledby={titleId}
        aria-describedby={metaId}
        className="group block focus-visible:outline-none"
      >
        <div className="aspect-[1200/630] w-full rounded-lg ring-(--adw-accent-color) ring-offset-4 ring-offset-(--adw-page-brown-bg) transition-shadow duration-300 group-hover:ring-2 group-focus-visible:ring-2 motion-reduce:transition-none">
          {imagePath === null
            ? (
                <div
                  aria-hidden="true"
                  className="flex size-full items-center justify-center rounded-lg border border-(--adw-light-3) bg-(--adw-light-2) bg-[linear-gradient(to_right,var(--adw-light-3)_1px,transparent_1px),linear-gradient(to_bottom,var(--adw-light-3)_1px,transparent_1px)] bg-size-[40px_40px] dark:border-(--adw-headerbar-bg-color) dark:bg-(--adw-window-bg-color) dark:bg-[linear-gradient(to_right,var(--adw-headerbar-bg-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--adw-headerbar-bg-color)_1px,transparent_1px)]"
                >
                  <span className="font-mono text-sm uppercase tracking-widest text-(--adw-dark-2) dark:text-(--adw-light-5)">
                    {article.category}
                  </span>
                </div>
              )
            : (
                <img src={imagePath} alt="" loading="lazy" className="size-full rounded-lg object-cover" />
              )}
        </div>
        <p id={metaId} className="mt-8 text-[1.375rem] font-medium text-(--adw-dark-2) dark:text-(--adw-light-5)">
          {formatArticleDate(article.date)}
          {" — "}
          {article.category}
        </p>
        <h3
          id={titleId}
          className="mt-4 text-[1.5625rem] leading-[1.33] font-medium sm:text-[1.875rem] sm:leading-[1.2] text-(--adw-dark-5) dark:text-(--adw-light-1)"
        >
          {article.title}
        </h3>
      </Link>
      <CopyArticleLinkButton path={`/articles/${article.slug}`} />
    </div>
  );
}
