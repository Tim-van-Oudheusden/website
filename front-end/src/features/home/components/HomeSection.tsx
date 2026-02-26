import * as React from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import type { HomeSectionId } from "../types/home-section";
import type { HomeSectionDefinition } from "../types/home-section";
import { ValuePillarsCarousel } from "./ValuePillarsCarousel";

const HERO_ANIMATION_PATH = "/animations/laptop_reboot.gif";
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
            "w-full",
            inWhiteWell ? "max-w-6xl lg:max-w-[83rem] rounded-[2rem] bg-white px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-6" : "",
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
  const isHero = section.id === "hero";
  const isStart = section.id === "start";
  const hasCta = section.ctaLabel != null && section.ctaTargetId != null;
  const isDiscoverCta = section.ctaLabel?.toLowerCase() === "discover";

  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
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
      <div className={cn("w-full", isStart ? "max-w-6xl lg:max-w-[83rem] rounded-[2rem] bg-white px-5 py-8 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:px-6 overflow-x-hidden overflow-y-visible" : "")}>
        <div
          className={cn(
            "flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-[74rem]",
            isStart ? "ml-auto md:flex-row md:items-end" : "",
            !isStart && isRow ? "md:flex-row md:items-center" : "",
          )}
        >
          <div className="flex flex-1 flex-col gap-5">
            <h2
              id={`${section.id}-heading`}
              className={cn(
                "font-semibold tracking-tight text-[var(--adw-dark-5)] dark:text-[var(--adw-light-1)]",
                isHero ? "text-4xl sm:text-5xl" : "text-[1.75rem] sm:text-[2rem]",
              )}
            >
              {section.heading}
            </h2>
            <p className="max-w-[65ch] text-base sm:text-lg leading-relaxed text-[var(--adw-dark-5)] dark:text-white/80">
              {section.body}
            </p>
            {hasCta && (
              <Button
                asChild
                variant="secondary"
                size="lg"
                className={cn(
                  "w-fit",
                  isDiscoverCta ? "bg-[var(--adw-dark-5)] text-white hover:bg-black/90" : "",
                )}
              >
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
          {isHero ? (
            <div className="flex flex-1 items-center justify-center md:flex-[1.6]">
              <div className="aspect-video w-full overflow-hidden rounded-2xl border border-black/45 shadow-[0_34px_72px_-24px_rgba(0,0,0,0.92)]">
                <img
                  src={HERO_ANIMATION_PATH}
                  alt="Laptop reboot animation"
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </div>
            </div>
          ) : isStart ? (
            <div className="relative flex flex-1 items-end justify-end overflow-visible">
              <img
                src={START_SECTION_PORTRAIT_PATH}
                alt="Portrait of Tim van Oudheusden"
                className="relative z-10 h-auto w-full max-w-[40rem] -mt-16 sm:-mt-20 lg:-mt-24 object-contain"
                loading="eager"
              />
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/10 p-8">
              <p className="text-sm text-[var(--adw-dark-5)]/50 dark:text-white/50">Media placeholder</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
