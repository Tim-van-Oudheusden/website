import type { JSX } from "react";
import { useCallback } from "react";
import { Link } from "react-router";

import { SITE_NAME } from "shared";

import { useLoadOnMount } from "@/shared/hooks/use-load-on-mount";
import type { ContentLoader } from "@/shared/lib/content-loader";

/**
 * The canyon's rim: the site itself and one flag per published project. The
 * flags are a bonus, so a failed or empty project list renders nothing rather
 * than an error box.
 */
export function CanyonRim({ loader }: { loader: ContentLoader }): JSX.Element | null {
  const load = useCallback(() => loader.listProjects(), [loader]);
  const { data: projects } = useLoadOnMount(load, "Failed to load projects");

  if (projects === null || projects.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
      <p className="text-lg font-semibold tracking-tight">{SITE_NAME}</p>
      <ul aria-label="Projects" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-base">
        {projects.map((project) => (
          <li key={project.slug}>
            <Link to={`/projects/${project.slug}`} className="underline underline-offset-4 hover:text-(--site-accent)">
              {project.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
