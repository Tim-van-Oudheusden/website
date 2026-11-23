import type { JSX } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { Button } from "@/shared/components/ui/button";

import { MAIN_CONTENT_ID } from "./skip-link";

export interface RouteErrorPageProps {
  /** Renders the page again (the boundary's `retry`); also called once the visitor navigates to another path. */
  retry: () => void;
}

/**
 * Shown in the page's place, under the top bar, when the page throws while rendering. After a deploy, a tab opened
 * before it asks for a lazy chunk the new build no longer has, or gets an API answer in a newer shape. `React.lazy`
 * keeps a rejected import, so "Try again" re-throws a missing chunk; reloading fetches the current build.
 *
 * Navigating away clears the error here rather than by keying the boundary on the path: a key would remount pages
 * that stay mounted across paths (the articles page from /articles to /articles/:slug) on every navigation.
 */
export function RouteErrorPage({ retry }: RouteErrorPageProps): JSX.Element {
  const { pathname } = useLocation();
  const [failedPathname] = useState(pathname);

  useEffect(() => {
    if (pathname !== failedPathname) {
      retry();
    }
  }, [pathname, failedPathname, retry]);

  return (
    <main id={MAIN_CONTENT_ID} className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--site-page-bg) p-4">
      <h1 className="text-3xl font-semibold">This page failed to load</h1>
      <p className="text-muted-foreground">
        The site may have been updated since you opened it. Reloading the page loads the latest version.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button
          type="button"
          onClick={() => {
            window.location.reload();
          }}
        >
          Reload page
        </Button>
        <Button type="button" variant="secondary" onClick={retry}>
          Try again
        </Button>
      </div>
    </main>
  );
}
