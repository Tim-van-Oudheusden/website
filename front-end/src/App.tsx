import type { JSX, ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { AGENTIC_PAGE_PATH, STANDALONE_PAGE_SLUGS } from "shared";

import { AgenticPage } from "@/features/agentic/pages/agentic-page";
import { ArticlesPage } from "@/features/articles/pages/articles-page";
import { TagPage } from "@/features/articles/pages/tag-page";
import { HomePage } from "@/features/home/pages/home-page";
import { ProjectPage } from "@/features/projects/pages/project-page";
import { ProjectsPage } from "@/features/projects/pages/projects-page";
import { StandalonePage } from "@/features/standalone-pages/pages/standalone-page";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { NotFoundPage } from "@/shared/components/not-found-page";
import { RouteErrorPage } from "@/shared/components/route-error-page";
import { SkipLink } from "@/shared/components/skip-link";
import { TopBar } from "@/shared/components/top-bar";

/** Route table only, so it can be asserted independently of the browser router. */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path={AGENTIC_PAGE_PATH} element={<AgenticPage />} />
      <Route path="/articles" element={<ArticlesPage />} />
      <Route path="/articles/:slug" element={<ArticlesPage />} />
      <Route path="/tags/:tag" element={<TagPage />} />
      {STANDALONE_PAGE_SLUGS.map((slug) => (
        <Route key={slug} path={`/${slug}`} element={<StandalonePage slug={slug} />} />
      ))}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export interface AppShellProps {
  children: ReactNode;
}

/** Site chrome (skip link, top bar) around the routed page. A page that throws while rendering leaves the chrome up. */
export function AppShell({ children }: AppShellProps): JSX.Element {
  return (
    <div className="flex min-h-svh flex-col">
      <SkipLink />
      <TopBar />
      <ErrorBoundary fallback={(retry) => <RouteErrorPage retry={retry} />}>
        {children}
      </ErrorBoundary>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppShell>
        <AppRoutes />
      </AppShell>
    </BrowserRouter>
  );
}
