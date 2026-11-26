import { cn } from "cn";
import { Check, Copy } from "lucide-react";
import type { JSX } from "react";
import { useEffect, useId, useState } from "react";
import { Link } from "react-router";

import type { ArticleSummary } from "shared/articles";
import { resolveSocialImagePath } from "shared/social-image";

import { formatArticleDate } from "@/features/articles/lib/article-date";
import { Button } from "@/shared/components/ui/button";

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

/** Copy and Check share a grid cell and crossfade: opacity plus a 2px blur, 200ms. */
const COPY_ICON_CLASSES = "col-start-1 row-start-1 size-5 transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-none";
const COPY_ICON_SHOWN = "opacity-100";
const COPY_ICON_HIDDEN = "opacity-0 blur-[2px]";

/**
 * Copies the article's absolute URL: an always-visible icon button with a 44px
 * hit area at the end of the card's date row. The outcome is announced through
 * a polite live region.
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
      {/* Sits on the date row: the cover is 52.5cqw tall (1200x630), the row starts 2rem
          below it, and the 44px box centres on the row's first 1.5-leading line. */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copyLink}
        className="absolute top-[calc(52.5cqw_+_2rem_+_(1.375rem_*_1.5_-_2.75rem)_/_2)] right-0 size-11 text-(--ink-2) dark:text-(--paper-5)"
      >
        {/* Both icons share one grid cell so the outgoing one fades and blurs while the incoming one sharpens. */}
        <span className="grid">
          <Copy aria-hidden="true" className={cn(COPY_ICON_CLASSES, status === "copied" ? COPY_ICON_HIDDEN : COPY_ICON_SHOWN)} />
          <Check aria-hidden="true" className={cn(COPY_ICON_CLASSES, status === "copied" ? COPY_ICON_SHOWN : COPY_ICON_HIDDEN)} />
        </span>
        <span className="sr-only">{COPY_LABELS[status]}</span>
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
    <div className="@container group/card relative">
      <Link
        to={`/articles/${article.slug}`}
        aria-labelledby={titleId}
        aria-describedby={metaId}
        className="group block focus-visible:outline-none"
      >
        <div className="aspect-[1200/630] w-full rounded-lg ring-(--site-accent) ring-offset-4 ring-offset-(--site-page-bg) transition-shadow duration-300 group-hover:ring-2 group-focus-visible:ring-2 motion-reduce:transition-none">
          {imagePath === null
            ? (
                <div
                  aria-hidden="true"
                  className="flex size-full items-center justify-center rounded-lg border border-(--paper-3) bg-(--paper-2) bg-[linear-gradient(to_right,var(--paper-3)_1px,transparent_1px),linear-gradient(to_bottom,var(--paper-3)_1px,transparent_1px)] bg-size-[40px_40px] dark:border-(--popover) dark:bg-(--background) dark:bg-[linear-gradient(to_right,var(--popover)_1px,transparent_1px),linear-gradient(to_bottom,var(--popover)_1px,transparent_1px)]"
                >
                  <span className="font-mono text-sm uppercase tracking-widest text-(--ink-2) dark:text-(--paper-5)">
                    {article.category}
                  </span>
                </div>
              )
            : (
                <img src={imagePath} alt="" loading="lazy" className="size-full rounded-lg object-cover" />
              )}
        </div>
        <p id={metaId} className="mt-8 pr-12 text-[1.375rem] leading-[1.5] font-medium text-(--ink-2) dark:text-(--paper-5)">
          {formatArticleDate(article.date)}
          {" — "}
          {article.category}
        </p>
        <h3
          id={titleId}
          className="mt-4 text-[1.5625rem] leading-[1.33] font-medium sm:text-[1.875rem] sm:leading-[1.2] text-(--ink-5) dark:text-(--paper-1)"
        >
          {article.title}
        </h3>
      </Link>
      <CopyArticleLinkButton path={`/articles/${article.slug}`} />
    </div>
  );
}
