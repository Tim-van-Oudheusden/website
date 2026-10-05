import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition } from "../types/home-section";
import { HomeSectionShell } from "./home-section-shell";
import { ValuePillarsCarousel } from "./value-pillars-carousel";

interface HomeSectionCarouselProps {
  section: HomeSectionDefinition;
}

/** Home 'carousel' variant: the value-pillars carousel inside an optional well. */
export function HomeSectionCarousel({ section }: HomeSectionCarouselProps): React.JSX.Element {
  const inWhiteWell = section.surfaceVariant === "white-well";

  return (
    <HomeSectionShell
      section={section}
      className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-4"
    >
      <div
        className={cn(
          "w-full",
          inWhiteWell ? "max-w-6xl lg:max-w-332 rounded-[2rem] bg-(--site-section-well-bg) px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-6" : "",
        )}
      >
        <ValuePillarsCarousel
          headingId={headingIdFor(section.id)}
          heading={section.heading}
          body={section.body}
          inWhiteWell={inWhiteWell}
        />
      </div>
    </HomeSectionShell>
  );
}
