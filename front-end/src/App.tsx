import type { JSX } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { STANDALONE_PAGE_SLUGS } from "shared";

import { ArticlesPage } from "@/features/articles/pages/articles-page";
import { HomePage } from "@/features/home/pages/home-page";
import { ProjectPage } from "@/features/projects/pages/project-page";
import { ProjectsPage } from "@/features/projects/pages/projects-page";
import { StandalonePage } from "@/features/standalone-pages/pages/standalone-page";
import { TopBar } from "@/shared/components/top-bar";

/** Route table only, so it can be asserted independently of the browser router. */
export function AppRoutes(): JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path="/articles" element={<ArticlesPage />} />
      <Route path="/articles/:slug" element={<ArticlesPage />} />
      {STANDALONE_PAGE_SLUGS.map((slug) => (
        <Route key={slug} path={`/${slug}`} element={<StandalonePage slug={slug} />} />
      ))}
    </Routes>
  );
}

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <div className="flex min-h-svh flex-col">
        <TopBar />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}
