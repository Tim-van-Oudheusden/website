import type { JSX } from "react";
import { useCallback } from "react";
import { Link } from "react-router";

import type { PageData } from "shared";

import { ErrorBoundary, renderErrorFallback } from "@/shared/components/error-boundary";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";

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
  const load = useCallback((): Promise<PageData | null> => fetchPage(slug), [slug]);
  const { status, data: page, error } = useLoadOnMount(load, "Failed to load page");

  if (status === "loading") {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-muted-foreground">Loading page...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (page === null) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--adw-page-brown-bg) p-4">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <Link to="/" className="text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] underline">
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="w-full flex-1 bg-[var(--adw-page-brown-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
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
        <ErrorBoundary fallback={renderErrorFallback}>
          <MarkdownRenderer content={page.body} />
        </ErrorBoundary>
      </article>
    </main>
  );
}
