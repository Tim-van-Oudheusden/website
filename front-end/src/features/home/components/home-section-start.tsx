import { cn } from "cn";
import type { JSX, MouseEvent } from "react";

import { Button } from "@/shared/components/ui/button";
import { SITE_WELL_BLEED_CLASSES } from "@/shared/lib/content-edge";

import { headingIdFor } from "../config/home-sections";
import type { HomeSectionId, HomeStartSection } from "../types/home-section";

import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";

const START_SECTION_PORTRAIT_PATH = "/images/me.png";

interface HomeSectionStartProps {
  section: HomeStartSection;
  onCtaActivate: (sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void;
}

/** Home 'start' section: oversized hero with a bottom-right portrait and a CTA. */
export function HomeSectionStart({ section, onCtaActivate }: HomeSectionStartProps): JSX.Element {
  const { ctaLabel, ctaTargetId } = section;

  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      {/* The well reaches past the content edge by the fixed well bleed and pads the hero text back onto it. */}
      <div
        data-testid="start-white-box"
        className={cn(
          "relative min-h-116 rounded-[2rem] bg-(--site-section-well-bg) shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] overflow-visible",
          SITE_WELL_BLEED_CLASSES,
        )}
      >
        <div className="py-8 sm:py-10">
          <div className="flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-none md:pr-[clamp(14rem,30vw,30rem)]">
            <div className="flex flex-1 flex-col gap-5">
              <h1
                id={headingIdFor(section.id)}
                className="font-bold tracking-tight text-(--ink-5) dark:text-(--paper-1) text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] leading-[1.05]"
              >
                {section.heading}
              </h1>
              <p className="max-w-[60ch] text-lg sm:text-xl leading-[1.55] text-(--ink-5) dark:text-white/80">
                {section.body}
              </p>
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="w-fit h-14 px-10 text-lg font-semibold tracking-wide bg-(--ink-5) text-white hover:bg-black/90 dark:bg-(--paper-1) dark:text-(--ink-5) dark:hover:bg-(--paper-1)/90"
              >
                <a
                  href={`#${ctaTargetId}`}
                  onClick={(event) => {
                    onCtaActivate(ctaTargetId, event);
                  }}
                >
                  {ctaLabel}
                </a>
              </Button>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-0 bottom-0 z-10 flex items-end justify-end">
          <img
            data-testid="start-portrait"
            src={START_SECTION_PORTRAIT_PATH}
            alt="Portrait of Tim van Oudheusden"
            className="h-auto w-[clamp(14.5rem,29vw,32rem)] rounded-br-[2rem] object-contain"
            loading="eager"
          />
        </div>
      </div>
    </HomeSectionFrame>
  );
}
