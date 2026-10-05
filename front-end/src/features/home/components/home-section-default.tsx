import type { JSX, MouseEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

import { HomeSectionShell } from "./home-section-shell";

interface HomeSectionDefaultProps {
  section: HomeSectionDefinition;
  onCtaActivate?: ((sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
}

/** Default home section: heading, body, optional CTA beside a media placeholder. */
export function HomeSectionDefault({ section, onCtaActivate }: HomeSectionDefaultProps): JSX.Element {
  const isRow = section.contentDirection === "row";
  const ctaLabel = section.ctaLabel;
  const ctaTargetId = section.ctaTargetId;
  const hasCta = ctaLabel !== undefined && ctaTargetId !== undefined;

  return (
    <HomeSectionShell section={section}>
      <div className="w-full">
        <div
          className={cn(
            "mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296",
            isRow ? "md:flex-row md:items-center" : "",
          )}
        >
          <div className="flex flex-1 flex-col gap-5">
            <h2
              id={headingIdFor(section.id)}
              className="font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]"
            >
              {section.heading}
            </h2>
            <p className="max-w-[65ch] text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
              {section.body}
            </p>
            {hasCta && (
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-fit"
              >
                <a
                  href={`#${ctaTargetId}`}
                  onClick={(event) => {
                    if (onCtaActivate !== undefined) {
                      onCtaActivate(ctaTargetId, event);
                    }
                  }}
                >
                  {ctaLabel}
                </a>
              </Button>
            )}
          </div>
          <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/10 p-8">
            <p className="text-sm text-(--adw-dark-5)/50 dark:text-white/50">Media placeholder</p>
          </div>
        </div>
      </div>
    </HomeSectionShell>
  );
}
