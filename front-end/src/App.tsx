import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { TopBar } from "@/shared/components/top-bar";
import { HomePage } from "@/features/home/pages/home-page";
import { ProjectsPage } from "@/features/projects/pages/projects-page";
import { ArticlesPage } from "@/features/articles/pages/articles-page";
import { ProjectPage } from "@/features/projects/pages/project-page";

/** Route table only, so it can be asserted independently of the browser router. */
export function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="/projects/:slug" element={<ProjectPage />} />
      <Route path="/articles" element={<ArticlesPage />} />
      <Route path="/articles/:slug" element={<ArticlesPage />} />
    </Routes>
  );
}

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <div className="flex min-h-svh flex-col">
        <TopBar />
        <AppRoutes />
      </div>
    </BrowserRouter>
  );
}