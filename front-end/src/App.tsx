import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { TopBar } from "@/shared/components/TopBar";
import { HomePage } from "@/features/home/pages/HomePage";
import { ProjectsPage } from "@/features/projects/pages/ProjectsPage";
import { ArticlesPage } from "@/features/articles/pages/ArticlesPage";
import { ProjectPage } from "@/features/projects/pages/ProjectPage";

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <div className="flex min-h-svh flex-col">
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/articles/:slug" element={<ArticlesPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
