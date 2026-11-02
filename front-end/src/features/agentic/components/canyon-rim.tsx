import type { JSX } from "react";
import { Link } from "react-router";

import type { ProjectFrontmatter } from "shared";
import { SITE_NAME } from "shared";

/**
 * The canyon's rim: the site itself and one flag per published project. The
 * flags are a bonus, so a project list that is still loading, failed (`null`)
 * or is empty renders nothing rather than an error box.
 */
export function CanyonRim({ projects }: { projects: readonly ProjectFrontmatter[] | null }): JSX.Element | null {
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
