import type { JSX } from "react";
import { Link } from "react-router";

import { MAIN_CONTENT_ID } from "./skip-link";

const WAYS_BACK = [
  { to: "/", label: "Home" },
  { to: "/articles", label: "Articles" },
  { to: "/projects", label: "Projects" },
] as const;

/**
 * Shown for a URL that names no page: a path no route matches, or an article
 * slug the API does not know. The production server answers these URLs with a
 * 404 (front-end/server/handler.ts), so the two must agree on what is missing.
 */
export function NotFoundPage(): JSX.Element {
  return (
    <main id={MAIN_CONTENT_ID} className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--site-page-bg) p-4">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">This page does not exist, or it has moved.</p>
      <nav aria-label="Ways back">
        <ul className="flex flex-wrap justify-center gap-4">
          {WAYS_BACK.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className="text-[var(--ink-5)] dark:text-[var(--paper-1)] underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
