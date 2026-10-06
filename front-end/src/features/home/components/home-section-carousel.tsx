import type { JSX } from "react";

import { cn } from "@/shared/lib/utils";

import { headingIdFor } from "../config/home-sections";
import type { HomeCarouselSection } from "../types/home-section";

import { HomeSectionFrame } from "./home-section-shell";
import { ValuePillarsCarousel } from "./value-pillars-carousel";

interface HomeSectionCarouselProps {
  section: HomeCarouselSection;
}

/** Home 'carousel' variant: the value-pillars carousel, framed in the section well or bare. */
export function HomeSectionCarousel({ section }: HomeSectionCarouselProps): JSX.Element {
  const inWell = section.carouselFrame === "well";

  return (
    <HomeSectionFrame
      section={section}
      as="section"
      className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-4"
    >
      <div
        className={cn(
          "w-full",
          inWell ? "max-w-6xl lg:max-w-332 rounded-[2rem] bg-(--site-section-well-bg) px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-6" : "",
        )}
      >
        <ValuePillarsCarousel
          headingId={headingIdFor(section.id)}
          heading={section.heading}
          body={section.body}
          inWell={inWell}
        />
      </div>
    </HomeSectionFrame>
  );
}
