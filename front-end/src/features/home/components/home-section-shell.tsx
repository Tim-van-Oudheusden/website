import { cn } from "cn";
import type { JSX, ReactNode } from "react";

import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition } from "../types/home-section";

export const HOME_SECTION_FRAME_CLASSES
  = "flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6";

export type HomeSectionFrameElement = "section" | "footer";

interface HomeSectionFrameProps {
  section: HomeSectionDefinition;
  /** Render the frame as a semantic `<footer>` instead of `<section>`. */
  as: HomeSectionFrameElement;
  className: string;
  children: ReactNode;
}

/**
 * Single section frame for every variant: owns the section id, `aria-labelledby`
 * (single-sourced from `headingIdFor`), and the bgColor surface. Variants that
 * render their own heading markup use the frame directly; the rest go through
 * `HomeHeadedSectionShell` so the shared heading markup lives in one place.
 */
export function HomeSectionFrame({ section, as, className, children }: HomeSectionFrameProps): JSX.Element {
  const frameProps = {
    "id": section.id,
    "aria-labelledby": headingIdFor(section.id),
    className,
    "style": { backgroundColor: section.bgColor },
  };

  return as === "footer"
    ? (
        <footer {...frameProps}>{children}</footer>
      )
    : (
        <section {...frameProps}>{children}</section>
      );
}

interface HomeHeadedSectionShellProps {
  section: HomeSectionDefinition;
  as: HomeSectionFrameElement;
  heading: string;
  body: string;
  /** Center the heading/body block and its container (trust / start-here layout). */
  centered: boolean;
  children: ReactNode;
}

/** Section frame with the shared heading/body block rendered above the variant content. */
export function HomeHeadedSectionShell({
  section,
  as,
  heading,
  body,
  centered,
  children,
}: HomeHeadedSectionShellProps): JSX.Element {
  return (
    <HomeSectionFrame section={section} as={as} className={HOME_SECTION_FRAME_CLASSES}>
      <div className="w-full">
        <div
          className={cn(
            "mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296",
            centered ? "items-center" : "",
          )}
        >
          <div className={cn("flex flex-1 flex-col", centered ? "items-center gap-4" : "gap-5")}>
            <h2
              id={headingIdFor(section.id)}
              className={cn(
                "font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]",
                centered ? "text-center" : "",
              )}
            >
              {heading}
            </h2>
            <p
              className={cn(
                "max-w-[65ch] text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80",
                centered ? "text-center" : "",
              )}
            >
              {body}
            </p>
          </div>
          {children}
        </div>
      </div>
    </HomeSectionFrame>
  );
}
