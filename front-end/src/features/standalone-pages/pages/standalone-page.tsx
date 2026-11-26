import type { JSX } from "react";
import { useCallback, useState } from "react";
import { Link } from "react-router";

import type { PageData } from "shared";

import { ErrorBoundary, renderErrorFallback } from "@/shared/components/error-boundary";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { Button } from "@/shared/components/ui/button";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";
import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { SITE_CONTENT_GUTTER_CLASSES } from "@/shared/lib/content-edge";

import { fetchPage } from "../lib/page-loader";

// `updated` is a calendar day ("2026-10-01"), which `Date` parses as UTC
// midnight: format in UTC so a reader west of Greenwich doesn't see the day before.
const UPDATED_FORMAT = new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" });

interface StandalonePageProps {
  /** The page's file name under content/pages/, without `.md`. */
  slug: string;
}

/** A single markdown page such as /now or /uses, with its last-updated date. */
export function StandalonePage({ slug }: StandalonePageProps): JSX.Element {
  // Each "Try again" bumps `attempt`; the new key remounts the content, which loads the page afresh.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setAttempt((count) => count + 1);
  }, []);

  return <StandalonePageContent key={attempt} slug={slug} retry={retry} />;
}

function StandalonePageContent({ slug, retry }: StandalonePageProps & { retry: () => void }): JSX.Element {
  const load = useCallback((): Promise<PageData | null> => fetchPage(slug), [slug]);
  const { status, data: page } = useLoadOnMount(load, "Failed to load page");

  useDocumentTitle(page?.title ?? null);

  if (status === "loading") {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 items-center justify-center bg-(--site-page-bg) p-4">
        <p className="text-muted-foreground">Loading page...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--site-page-bg) p-4">
        <p role="alert" className="text-muted-foreground">This page could not be loaded right now.</p>
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      </main>
    );
  }

  if (page === null) {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--site-page-bg) p-4">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <Link to="/" className="text-[var(--ink-5)] dark:text-[var(--paper-1)] underline">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main id={MAIN_CONTENT_ID} className={`w-full flex-1 bg-[var(--site-page-bg)] py-8 sm:py-10 ${SITE_CONTENT_GUTTER_CLASSES}`}>
      <article className="mx-auto w-full max-w-[75ch]">
        <header className="mb-8">
          <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">{page.title}</h1>
          {page.description !== "" && (
            <p className="text-muted-foreground mt-2 max-w-[65ch] text-base leading-relaxed sm:text-lg">{page.description}</p>
          )}
          <p className="text-muted-foreground mt-4 text-sm font-medium">
            Last updated
            {" "}
            <time dateTime={page.updated}>{UPDATED_FORMAT.format(new Date(page.updated))}</time>
          </p>
        </header>
        {/*
          Offset 0: page bodies (content/pages/) start at `##`, so sections render as <h2> under the header's <h1>.
          A body that opens with `#` would add a second <h1>; switch to 1 (as project/article pages do) if that changes.
        */}
        <ErrorBoundary fallback={renderErrorFallback}>
          <MarkdownRenderer content={page.body} headingLevelOffset={0} />
        </ErrorBoundary>
      </article>
    </main>
  );
}
