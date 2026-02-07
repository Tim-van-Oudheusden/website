import * as React from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { TopBar } from "@/components/TopBar";
import { HomePage } from "@/pages/HomePage";
import { ProjectsPage } from "@/pages/ProjectsPage";

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <div className="flex min-h-svh flex-col">
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/projects" element={<ProjectsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
