import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { ROUTES } from "shared";
import { apiGet, ApiError } from "@/shared/lib/api";
import { Badge } from "@/shared/components/ui/badge";
import { MarkdownRenderer } from "@/shared/components/MarkdownRenderer";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";

interface ProjectData {
  title: string;
  description: string;
  date: string;
  tags: string[];
  slug: string;
  body: string;
}

export function ProjectPage(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const contentSlug = slug;

    let cancelled = false;

    async function fetchProject(): Promise<void> {
      try {
        const path = ROUTES.CONTENT_BY_SLUG.replace(":slug", contentSlug);
        const data = await apiGet<ProjectData>(path);
        if (!cancelled) {
          setProject(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiError && err.status === 404) {
            setNotFound(true);
          } else {
            let message = "Failed to load project";
            if (err instanceof ApiError) {
              message = err.message;
            }
            setError(message);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchProject();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-muted-foreground">Loading project...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
        <h1 className="text-3xl font-bold">Project not found</h1>
        <Link to="/projects" className="text-primary underline">
          Back to projects
        </Link>
      </main>
    );
  }

  if (error !== null || project === null) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <p className="text-destructive">{error ?? "Something went wrong"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-screen-xl flex-1 p-4 sm:p-6 lg:p-8">
      <article>
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{project.title}</h1>
          <p className="text-muted-foreground mt-2">{project.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <time className="text-muted-foreground text-sm">
              {new Date(project.date).toLocaleDateString()}
            </time>
            {project.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </header>
        <ErrorBoundary>
          <MarkdownRenderer content={project.body} />
        </ErrorBoundary>
      </article>
    </main>
  );
}
