import * as React from "react";
import { Button } from "@/shared/components/ui/button";
import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";
import { HomeSectionShell } from "./home-section-shell";

const START_SECTION_PORTRAIT_PATH = "/images/me.png";

interface HomeSectionStartProps {
  section: HomeSectionDefinition;
  onCtaActivate?: ((sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void) | undefined;
}

/** Home 'start' section: oversized hero with a bottom-right portrait and a CTA. */
export function HomeSectionStart({ section, onCtaActivate }: HomeSectionStartProps): React.JSX.Element {
  const ctaLabel = section.ctaLabel;
  const ctaTargetId = section.ctaTargetId;
  const hasCta = ctaLabel !== undefined && ctaTargetId !== undefined;

  return (
    <HomeSectionShell section={section}>
      <div
        data-testid="start-white-box"
        className="relative w-full max-w-6xl lg:max-w-332 min-h-116 rounded-[2rem] bg-(--site-section-well-bg) shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] overflow-visible"
      >
        <div className="pl-7.5 pr-5 py-8 sm:pl-12 sm:pr-8 sm:py-10 lg:pl-9 lg:pr-6">
          <div className="flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296 md:pr-[clamp(14rem,30vw,30rem)]">
            <div className="flex flex-1 flex-col gap-5">
              <h2
                id={headingIdFor(section.id)}
                className="font-bold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem] leading-[1.05]"
              >
                {section.heading}
              </h2>
              <p className="max-w-[60ch] text-lg sm:text-xl leading-[1.55] text-(--adw-dark-5) dark:text-white/80">
                {section.body}
              </p>
              {hasCta && (
                <Button
                  asChild
                  variant="secondary"
                  size="lg"
                  className="w-fit h-14 px-10 text-lg font-semibold tracking-wide bg-(--adw-dark-5) text-white hover:bg-black/90"
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
    </HomeSectionShell>
  );
}
