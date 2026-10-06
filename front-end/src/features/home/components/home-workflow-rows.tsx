import type { JSX } from "react";

import { cn } from "@/shared/lib/utils";

import type { HomeWorkflowSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

interface HomeWorkflowRowsProps {
  section: HomeWorkflowSection;
}

/**
 * 'how I work' alternating feature rows for the home for-devs section.
 *
 * Each row pairs a real tool (media slot) with what it enables (text). Rows
 * alternate media-on-left / media-on-right so the list reads as a deliberate
 * workflow, not a feature dump.
 */
export function HomeWorkflowRows({ section }: HomeWorkflowRowsProps): JSX.Element {
  return (
    <HomeHeadedSectionShell
      as="section"
      section={section}
      heading={section.heading}
      body={section.body}
      centered={false}
    >
      <div className="flex flex-col gap-6">
        {section.features.map((feature, index) => {
          const reverse = index % 2 === 1;

          return (
            <article
              key={feature.title}
              data-testid={`workflow-row-${index}`}
              aria-labelledby={`${section.id}-workflow-row-${index}-title`}
              className={cn(
                "flex flex-col gap-5 md:flex-row md:items-center",
                reverse ? "md:flex-row-reverse" : "",
              )}
            >
              <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/10 p-8">
                <p className="text-sm text-(--adw-dark-5)/50 dark:text-white/50">
                  {feature.mediaLabel}
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-3">
                <h3
                  id={`${section.id}-workflow-row-${index}-title`}
                  className="font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-lg sm:text-xl"
                >
                  {feature.title}
                </h3>
                <p className="max-w-[65ch] text-base leading-relaxed text-(--adw-dark-5) dark:text-white/80">
                  {feature.description}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </HomeHeadedSectionShell>
  );
}
