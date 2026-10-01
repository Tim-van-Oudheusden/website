import * as React from "react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import type { ProjectFrontmatter } from "shared";
import { ApiError } from "@/shared/lib/api";
import { httpContentLoader } from "@/shared/lib/content-loader";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { ErrorBoundary } from "@/shared/components/error-boundary";

export type ProjectData = ProjectFrontmatter & { body: string };

export const PROJECT_PAGE_LAYOUT_CLASSES = {
  main: "w-full flex-1 bg-[var(--adw-page-brown-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
  articleMeasure: "mx-auto w-full max-w-[75ch]",
  coverFrame: "mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-[var(--site-section-well-bg)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]",
  metadataPanel: "mb-8 mt-8 rounded-[2rem] bg-[var(--site-section-well-bg)] p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:p-6",
} as const;

export const PROJECT_PAGE_TYPOGRAPHY_CLASSES = {
  title: "text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
  description: "text-muted-foreground mt-2 max-w-[65ch] text-base leading-relaxed sm:text-lg",
  metaLabel: "text-muted-foreground text-xs font-bold uppercase tracking-[0.16em]",
  metaValue: "text-sm font-medium",
  tagBadge: "text-xs font-bold",
} as const;

interface ProjectMetaHeaderProps {
  project: ProjectData;
}

export function ProjectMetaHeader({ project }: ProjectMetaHeaderProps): React.JSX.Element {
  return (
    <header className="mb-8">
      <Link to="/projects" className="text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] mb-6 inline-flex text-sm font-semibold underline-offset-4 hover:underline">
        Back to projects
      </Link>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.coverFrame}>
        <img src={project.coverImage} alt={project.coverImageAlt} className="h-full w-full object-cover" loading="eager" />
      </div>
      <h1 className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.title}>{project.title}</h1>
      <p className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.description}>{project.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <time className="text-muted-foreground text-sm font-medium">{new Date(project.date).toLocaleDateString()}</time>
        {project.status !== undefined && <Badge variant="secondary" className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.tagBadge}>{project.status}</Badge>}
        {project.tags.map((tag) => (
          <Badge key={tag} variant="outline" className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.tagBadge}>{tag}</Badge>
        ))}
      </div>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.metadataPanel}>
        <dl className="grid gap-4 sm:grid-cols-3">
          {project.role !== undefined && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Role</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.role}</dd>
            </div>
          )}
          {project.created !== undefined && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Created</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.created}</dd>
            </div>
          )}
          {project.info !== undefined && (
            <div className="sm:col-span-3">
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Info</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.info}</dd>
            </div>
          )}
        </dl>
        {project.links.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {project.links.map((link) => (
              <Button key={`${link.type}-${link.href}`} asChild variant="secondary" size="sm">
                <a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}>
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
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
        const data = await httpContentLoader.getProject(contentSlug);
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
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-muted-foreground">Loading project...</p>
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--adw-page-brown-bg) p-4">
        <h1 className="text-3xl font-semibold">Project not found</h1>
        <Link to="/projects" className="text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] underline">
          Back to projects
        </Link>
      </main>
    );
  }

  if (error !== null || project === null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-destructive">{error ?? "Something went wrong"}</p>
      </main>
    );
  }

  return (
    <main className={PROJECT_PAGE_LAYOUT_CLASSES.main}>
      <article className={PROJECT_PAGE_LAYOUT_CLASSES.articleMeasure}>
        <ProjectMetaHeader project={project} />
        <ErrorBoundary>
          <MarkdownRenderer content={project.body} />
        </ErrorBoundary>
      </article>
    </main>
  );
}
