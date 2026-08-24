import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { HomeFeatureRow } from "../types/home-section";

interface HomeWorkflowRowsProps {
  sectionId: string;
  headingId: string;
  heading: string;
  body: string;
  bgColor: string;
  features: HomeFeatureRow[];
}

/**
 * 'how I work' alternating feature rows for the home for-devs section.
 *
 * Each row pairs a real tool (media slot) with what it enables (text). Rows
 * alternate media-on-left / media-on-right so the list reads as a deliberate
 * workflow, not a feature dump.
 */
export function HomeWorkflowRows({
  sectionId,
  headingId,
  heading,
  body,
  bgColor,
  features,
}: HomeWorkflowRowsProps): React.JSX.Element {
  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296">
          <div className="flex flex-1 flex-col gap-5">
            <h2
              id={headingId}
              className="font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]"
            >
              {heading}
            </h2>
            <p className="max-w-[65ch] text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
              {body}
            </p>
          </div>
          <div className="flex flex-col gap-6">
            {features.map((feature, index) => {
              const reverse = index % 2 === 1;
              return (
                <article
                  key={feature.title}
                  data-testid={`workflow-row-${index}`}
                  aria-labelledby={`${sectionId}-workflow-row-${index}-title`}
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
                      id={`${sectionId}-workflow-row-${index}-title`}
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
        </div>
      </div>
    </section>
  );
}