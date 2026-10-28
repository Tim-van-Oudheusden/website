import type { JSX } from "react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";

import type { ProjectFrontmatter } from "shared";

import { ErrorBoundary, renderErrorFallback } from "@/shared/components/error-boundary";
import { MarkdownRenderer } from "@/shared/components/markdown-renderer";
import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import { useRecordView } from "@/shared/hooks/use-record-view";
import { ApiError } from "@/shared/lib/api";
import { httpContentLoader } from "@/shared/lib/content-loader";
import { STATUS_PILL_CLASSES } from "@/shared/lib/status-pill";
import { TAG_PILL_CLASSES } from "@/shared/lib/tag-pill";

export type ProjectData = ProjectFrontmatter & { body: string };

// `date` is a calendar day ("2026-10-16"), which `Date` parses as UTC midnight:
// format in UTC so a reader west of Greenwich doesn't see the day before.
const PROJECT_DATE_OPTIONS: Intl.DateTimeFormatOptions = { timeZone: "UTC" };

/** The project, or null when the API has no project under `slug`. */
async function loadProjectOrNull(slug: string): Promise<ProjectData | null> {
  try {
    return await httpContentLoader.getProject(slug);
  } catch (err: unknown) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }

    throw err;
  }
}

export const PROJECT_PAGE_LAYOUT_CLASSES = {
  main: "w-full flex-1 bg-[var(--site-page-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
  articleMeasure: "mx-auto w-full max-w-[75ch]",
  coverFrame: "mb-8 aspect-[16/10] overflow-hidden rounded-[2rem] bg-[var(--site-section-well-bg)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)]",
  metadataPanel: "mb-8 mt-8 rounded-[2rem] bg-[var(--site-section-well-bg)] p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:p-6",
} as const;

export const PROJECT_PAGE_TYPOGRAPHY_CLASSES = {
  title: "text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
  description: "text-muted-foreground mt-2 max-w-[65ch] text-base leading-relaxed sm:text-lg",
  metaLabel: "text-muted-foreground text-xs font-bold uppercase tracking-[0.16em]",
  metaValue: "text-sm font-medium",
  statusBadge: `text-xs font-bold ${STATUS_PILL_CLASSES}`,
} as const;

interface ProjectMetaHeaderProps {
  project: ProjectData;
}

export function ProjectMetaHeader({ project }: ProjectMetaHeaderProps): JSX.Element {
  return (
    <header className="mb-8">
      <Link to="/projects" className="text-[var(--ink-5)] dark:text-[var(--paper-1)] mb-6 inline-flex text-sm font-semibold underline-offset-4 hover:underline">
        Back to projects
      </Link>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.coverFrame}>
        <img src={project.coverImage} alt={project.coverImageAlt} className="h-full w-full object-cover" loading="eager" />
      </div>
      <h1 className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.title}>{project.title}</h1>
      <p className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.description}>{project.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <time className="text-muted-foreground text-sm font-medium">{new Date(project.date).toLocaleDateString(undefined, PROJECT_DATE_OPTIONS)}</time>
        {project.status !== null && <Badge variant="secondary" className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.statusBadge}>{project.status}</Badge>}
        {project.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className={TAG_PILL_CLASSES}>{tag}</Badge>
        ))}
      </div>
      <div className={PROJECT_PAGE_LAYOUT_CLASSES.metadataPanel}>
        <dl className="grid gap-4 sm:grid-cols-3">
          {project.role !== null && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Role</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.role}</dd>
            </div>
          )}
          {project.created !== null && (
            <div>
              <dt className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaLabel}>Created</dt>
              <dd className={PROJECT_PAGE_TYPOGRAPHY_CLASSES.metaValue}>{project.created}</dd>
            </div>
          )}
          {project.info !== null && (
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

export function ProjectPage(): JSX.Element {
  const { slug } = useParams<{ slug: string }>();
  // No slug means nothing to load: the hook stays idle and the page reads as not found.
  const load = useMemo(() => (slug ? (): Promise<ProjectData | null> => loadProjectOrNull(slug) : null), [slug]);
  const { status, data: project, error } = useLoadOnMount(load, "Failed to load project");

  useRecordView(project?.slug ?? null);

  if (status === "loading") {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 items-center justify-center bg-(--site-page-bg) p-4">
        <p className="text-muted-foreground">Loading project...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 items-center justify-center bg-(--site-page-bg) p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (project === null) {
    return (
      <main id={MAIN_CONTENT_ID} className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--site-page-bg) p-4">
        <h1 className="text-3xl font-semibold">Project not found</h1>
        <Link to="/projects" className="text-[var(--ink-5)] dark:text-[var(--paper-1)] underline">
          Back to projects
        </Link>
      </main>
    );
  }

  return (
    <main id={MAIN_CONTENT_ID} className={PROJECT_PAGE_LAYOUT_CLASSES.main}>
      <article className={PROJECT_PAGE_LAYOUT_CLASSES.articleMeasure}>
        <ProjectMetaHeader project={project} />
        <ErrorBoundary fallback={renderErrorFallback}>
          <MarkdownRenderer content={project.body} headingLevelOffset={1} />
        </ErrorBoundary>
      </article>
    </main>
  );
}
