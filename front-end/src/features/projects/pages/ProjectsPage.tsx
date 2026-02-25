import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ROUTES, type ContentFrontmatter } from "shared";
import { apiGet, ApiError } from "@/shared/lib/api";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";

export function ProjectsPage(): React.JSX.Element {
  const [projects, setProjects] = useState<ContentFrontmatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects(): Promise<void> {
      try {
        const data = await apiGet<ContentFrontmatter[]>(`${ROUTES.CONTENT}?type=project`);
        if (!cancelled) {
          setProjects(data);
        }
      } catch (err) {
        if (!cancelled) {
          let message = "Failed to load projects";
          if (err instanceof ApiError) {
            message = err.message;
          }
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProjects();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--adw-page-brown-bg)] p-4">
        <p className="text-muted-foreground">Loading projects...</p>
      </main>
    );
  }

  if (error !== null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-[var(--adw-page-brown-bg)] p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (projects.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-[var(--adw-page-brown-bg)] p-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
        <p className="text-muted-foreground">No projects yet.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl flex-1 bg-[var(--adw-page-brown-bg)] p-4 sm:p-6 lg:p-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Link key={project.slug} to={`/projects/${project.slug}`} className="group">
            <Card className="transition-colors group-hover:border-primary">
              <CardHeader>
                <CardTitle>{project.title}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
                <div className="flex flex-wrap gap-1 pt-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <p className="text-muted-foreground pt-1 text-xs">
                  {new Date(project.date).toLocaleDateString()}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
