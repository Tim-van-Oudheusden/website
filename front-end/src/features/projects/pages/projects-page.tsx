import * as React from "react";
import { useState, useEffect } from "react";
import { Link } from "react-router";
import type { ProjectFrontmatter } from "shared";
import { ApiError } from "@/shared/lib/api";
import { httpContentLoader } from "@/shared/lib/content-loader";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/components/ui/card";
import { resolvePriorityProjects, resolveGalleryProjects } from "../lib/project-display";

export const PROJECTS_PAGE_LAYOUT_CLASSES = {
  main: "w-full flex-1 bg-[var(--adw-page-brown-bg)] px-4 py-8 sm:px-6 sm:py-10 lg:px-8",
  inner: "mx-auto flex w-full max-w-screen-xl flex-col gap-8",
  heroWell: "rounded-[2rem] bg-[var(--site-section-well-bg)] px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-10",
  featuredGrid: "grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch",
  galleryGrid: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
} as const;

export const PROJECTS_PAGE_TYPOGRAPHY_CLASSES = {
  eyebrow: "text-muted-foreground text-sm font-bold uppercase tracking-[0.18em]",
  title: "mt-3 text-[2.5rem] font-bold leading-[1.05] tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] sm:text-[3.25rem] lg:text-[3.75rem]",
  description: "mt-5 max-w-[65ch] text-base leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80 sm:text-lg",
  sectionTitle: "text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]",
  cardTitle: "text-xl font-semibold tracking-tight",
  cardDescription: "text-muted-foreground text-sm leading-relaxed",
  projectTagBadge: "bg-[var(--adw-dark-5)] text-[var(--adw-light-1)] font-bold [a&]:hover:bg-[var(--adw-dark-5)]/90 dark:bg-[var(--adw-light-1)] dark:text-[var(--adw-dark-5)] dark:[a&]:hover:bg-[var(--adw-light-1)]/90",
  caseStudyButton: "w-fit h-14 px-10 text-lg font-semibold tracking-wide bg-[var(--adw-dark-5)] text-white hover:bg-black/90",
} as const;

export const PROJECTS_PAGE_TEXT = {
  eyebrow: "Selected work",
  heading: "Projects",
  description: "A curated set of projects that show how I build practical, maintainable systems across content, automation, and web experiences.",
  featuredHeading: "Featured project",
  galleryHeading: "More projects",
} as const;

interface ProjectCardProps {
  project: ProjectFrontmatter;
  featured?: boolean;
}

export function ProjectCard({ project, featured = false }: ProjectCardProps): React.JSX.Element {
  return (
    <Card className="group h-full overflow-hidden border-border bg-(--site-section-well-bg) p-0 transition-[border-color,box-shadow] hover:border-[var(--adw-dark-5)] hover:ring-1 hover:ring-[var(--adw-dark-5)] dark:hover:border-[var(--adw-light-1)] dark:hover:ring-[var(--adw-light-1)]">
      <Link to={`/projects/${project.slug}`} className="flex h-full flex-col gap-6">
        <div className={featured ? "aspect-16/10 overflow-hidden" : "aspect-4/3 overflow-hidden"}>
          <img
            src={project.coverImage}
            alt={project.coverImageAlt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading={featured ? "eager" : "lazy"}
          />
        </div>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {project.status !== undefined && <Badge variant="secondary">{project.status}</Badge>}
            {project.created !== undefined && <span className="text-muted-foreground text-xs font-medium">{project.created}</span>}
          </div>
          <CardTitle className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.cardTitle}>{project.title}</CardTitle>
          <CardDescription className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.cardDescription}>{project.description}</CardDescription>
        </CardHeader>
        <CardContent className="mt-auto flex flex-col gap-4 pb-6">
          {project.info !== undefined && (
            <p className="text-sm font-medium text-(--adw-dark-4) dark:text-(--adw-light-2)">{project.info}</p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className={`text-xs ${PROJECTS_PAGE_TYPOGRAPHY_CLASSES.projectTagBadge}`}>
                {tag}
              </Badge>
            ))}
          </div>
          <span className="text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)] text-sm font-semibold">View project</span>
        </CardContent>
      </Link>
    </Card>
  );
}

export function ProjectsPage(): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectFrontmatter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects(): Promise<void> {
      try {
        const data = await httpContentLoader.listProjects();

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

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-muted-foreground">Loading projects...</p>
      </main>
    );
  }

  if (error !== null) {
    return (
      <main className="flex flex-1 items-center justify-center bg-(--adw-page-brown-bg) p-4">
        <p className="text-destructive">{error}</p>
      </main>
    );
  }

  if (projects.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-(--adw-page-brown-bg) p-4">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Projects</h1>
        <p className="text-muted-foreground">Project case studies are being prepared.</p>
      </main>
    );
  }

  const priorityProjects = resolvePriorityProjects(projects);
  const primaryProject = priorityProjects[0] ?? null;
  const secondaryProjects = priorityProjects.slice(1);
  const galleryProjects = resolveGalleryProjects(projects);

  return (
    <main className={PROJECTS_PAGE_LAYOUT_CLASSES.main}>
      <div className={PROJECTS_PAGE_LAYOUT_CLASSES.inner}>
        <section className={PROJECTS_PAGE_LAYOUT_CLASSES.heroWell} aria-labelledby="projects-heading">
          <p className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.eyebrow}>{PROJECTS_PAGE_TEXT.eyebrow}</p>
          <h1 id="projects-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.title}>{PROJECTS_PAGE_TEXT.heading}</h1>
          <p className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.description}>{PROJECTS_PAGE_TEXT.description}</p>
        </section>

        {primaryProject !== null && (
          <section aria-labelledby="featured-project-heading" className="flex flex-col gap-4">
            <h2 id="featured-project-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.sectionTitle}>{PROJECTS_PAGE_TEXT.featuredHeading}</h2>
            <div className={PROJECTS_PAGE_LAYOUT_CLASSES.featuredGrid}>
              <ProjectCard project={primaryProject} featured />
              <div className="flex flex-col gap-4">
                {secondaryProjects.map((project) => (
                  <ProjectCard key={project.slug} project={project} />
                ))}
                {secondaryProjects.length === 0 && (
                  <div className="rounded-[2rem] bg-(--site-section-well-bg) p-5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:p-6">
                    <p className="text-muted-foreground text-sm font-bold uppercase tracking-[0.18em]">Why this matters</p>
                    <p className="mt-4 text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
                      {primaryProject.info ?? primaryProject.description}
                    </p>
                    <Button asChild variant="secondary" size="lg" className={`mt-6 ${PROJECTS_PAGE_TYPOGRAPHY_CLASSES.caseStudyButton}`}>
                      <Link to={`/projects/${primaryProject.slug}`}>Read the case study</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {galleryProjects.length > 0 && (
          <section aria-labelledby="more-projects-heading" className="flex flex-col gap-4">
            <h2 id="more-projects-heading" className={PROJECTS_PAGE_TYPOGRAPHY_CLASSES.sectionTitle}>{PROJECTS_PAGE_TEXT.galleryHeading}</h2>
            <div className={PROJECTS_PAGE_LAYOUT_CLASSES.galleryGrid}>
              {galleryProjects.map((project) => (
                <ProjectCard key={project.slug} project={project} />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
