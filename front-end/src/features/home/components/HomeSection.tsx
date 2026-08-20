import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { HomeSectionId } from "../types/home-section";
import type { HomeSectionDefinition } from "../types/home-section";
import { ValuePillarsCarousel } from "./ValuePillarsCarousel";

const START_SECTION_PORTRAIT_PATH = "/images/me.png";

interface HomeSectionProps {
  section: HomeSectionDefinition;
  onCtaActivate?: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function HomeSection({ section, onCtaActivate }: HomeSectionProps): React.JSX.Element {
  if (section.variant === "carousel") {
    const inWhiteWell = section.surfaceVariant === "white-well";

    return (
      <section
        id={section.id}
        aria-labelledby={`${section.id}-heading`}
        className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-4"
        style={{
          backgroundColor: section.bgColor,
          ...(section.bgImage !== undefined
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
            "w-full",
            inWhiteWell ? "max-w-6xl lg:max-w-332 rounded-[2rem] bg-(--site-section-well-bg) px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-6" : "",
          )}
        >
          <ValuePillarsCarousel
            headingId={`${section.id}-heading`}
            heading={section.heading}
            body={section.body}
            inWhiteWell={inWhiteWell}
          />
        </div>
      </section>
    );
  }

  const isRow = section.contentDirection === "row";
  const isStart = section.id === "start";
  const ctaLabel = section.ctaLabel;
  const ctaTargetId = section.ctaTargetId;
  const hasCta = ctaLabel !== undefined && ctaTargetId !== undefined;
  const isDiscoverCta = ctaLabel?.toLowerCase() === "discover";

  if (isStart) {
    return (
      <section
        id={section.id}
        aria-labelledby={`${section.id}-heading`}
        className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
        style={{
          backgroundColor: section.bgColor,
          ...(section.bgImage !== undefined
            ? {
                backgroundImage: `url(${section.bgImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : {}),
        }}
      >
        <div
          data-testid="start-white-box"
          className="relative w-full max-w-6xl lg:max-w-332 min-h-116 rounded-[2rem] bg-(--site-section-well-bg) shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] overflow-visible"
        >
          <div className="pl-7.5 pr-5 py-8 sm:pl-12 sm:pr-8 sm:py-10 lg:pl-9 lg:pr-6">
            <div className="flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296 md:pr-[clamp(14rem,30vw,30rem)]">
              <div className="flex flex-1 flex-col gap-5">
                <h2
                  id={`${section.id}-heading`}
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
                    className={cn(
                      "w-fit h-14 px-10 text-lg font-semibold tracking-wide",
                      isDiscoverCta ? "bg-(--adw-dark-5) text-white hover:bg-black/90" : "",
                    )}
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
      </section>
    );
  }

  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
      style={{
        backgroundColor: section.bgColor,
        ...(section.bgImage !== undefined
          ? {
              backgroundImage: `url(${section.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      <div className="w-full">
        <div
          className={cn(
            "mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296",
            isRow ? "md:flex-row md:items-center" : "",
          )}
        >
          <div className="flex flex-1 flex-col gap-5">
            <h2
              id={`${section.id}-heading`}
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
                className={cn(
                  "w-fit",
                  isDiscoverCta ? "bg-(--adw-dark-5) text-white hover:bg-black/90" : "",
                )}
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
    </section>
  );
}
