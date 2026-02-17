import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { HomeSectionId } from "../types/home-section";
import type { HomeSectionDefinition } from "../types/home-section";

interface HomeSectionProps {
  section: HomeSectionDefinition;
  onCtaActivate?: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function HomeSection({ section, onCtaActivate }: HomeSectionProps): React.JSX.Element {
  const isRow = section.contentDirection === "row";
  const isHero = section.id === "hero";
  const hasCta = section.ctaLabel != null && section.ctaTargetId != null;

  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16"
      style={{
        backgroundColor: section.bgColor,
        ...(section.bgImage != null
          ? {
              backgroundImage: `url(${section.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      <div
        className={cn(
          "flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-5xl",
          isRow ? "md:flex-row md:items-center" : "",
        )}
      >
        <div className="flex flex-1 flex-col gap-5">
          <h2
            id={`${section.id}-heading`}
            className={cn(
              "font-semibold tracking-tight text-white",
              isHero ? "text-4xl sm:text-5xl" : "text-2xl sm:text-3xl",
            )}
          >
            {section.heading}
          </h2>
          <p className="leading-relaxed text-white/80">
            {section.body}
          </p>
          {hasCta && (
            <Button asChild variant="secondary" size="lg" className="w-fit">
              <a
                href={`#${section.ctaTargetId}`}
                onClick={(event) => {
                  if (section.ctaTargetId != null && onCtaActivate != null) {
                    onCtaActivate(section.ctaTargetId, event);
                  }
                }}
              >
                {section.ctaLabel}
              </a>
            </Button>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/10 p-8">
          <p className="text-sm text-white/50">Media placeholder</p>
        </div>
      </div>
    </section>
  );
}
