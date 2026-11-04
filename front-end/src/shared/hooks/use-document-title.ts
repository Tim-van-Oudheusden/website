import { useEffect } from "react";

import { SITE_NAME } from "shared";

/**
 * Keeps the tab title on the page the visitor is on. The server only titles
 * the page a visit starts on (front-end/server/handler.ts), so after a
 * client-side navigation the title is this hook's to set. `pageTitle` gives
 * the same `Page | Site` form the server sends; null gives the site name,
 * as the server sends for the home, tag and not-found pages.
 */
export function useDocumentTitle(pageTitle: string | null): void {
  useEffect(() => {
    document.title = pageTitle === null ? SITE_NAME : `${pageTitle} | ${SITE_NAME}`;
  }, [pageTitle]);
}
