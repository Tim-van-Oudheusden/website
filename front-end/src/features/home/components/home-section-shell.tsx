import type { JSX, ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition } from "../types/home-section";

const DEFAULT_FRAME_CLASSES
  = "flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6";

interface HomeSectionShellProps {
  section: HomeSectionDefinition;
  className?: string;
  /** Render the frame as a semantic `<footer>` instead of `<section>`. */
  as?: "section" | "footer";
  /** Shared heading/body block rendered above the children, when provided. */
  heading?: string;
  body?: string;
  /** Center the heading/body block and its container (trust / start-here layout). */
  centered?: boolean;
  children: ReactNode;
}

/**
 * Single section frame for every variant: owns the section id, `aria-labelledby`
 * (single-sourced from `headingIdFor`), and the bgColor/bgImage surface. Variants
 * that render their own heading markup pass only `children`; the five content-only
 * variants pass `heading`/`body` so the heading markup lives here exactly once.
 */
export function HomeSectionShell({
  section,
  className,
  as = "section",
  heading,
  body,
  centered = false,
  children,
}: HomeSectionShellProps): JSX.Element {
  const headingId = headingIdFor(section.id);

  const frameProps = {
    "id": section.id,
    "aria-labelledby": headingId,
    "className": className ?? DEFAULT_FRAME_CLASSES,
    "style": {
      backgroundColor: section.bgColor,
      ...(section.bgImage !== undefined
        ? {
            backgroundImage: `url(${section.bgImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }
        : {}),
    },
  };

  const content
    = heading === undefined && body === undefined
      ? (
          children
        )
      : (
          <div className="w-full">
            <div
              className={cn(
                "mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296",
                centered ? "items-center" : "",
              )}
            >
              <div className={cn("flex flex-1 flex-col", centered ? "items-center gap-4" : "gap-5")}>
                {heading !== undefined && (
                  <h2
                    id={headingId}
                    className={cn(
                      "font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]",
                      centered ? "text-center" : "",
                    )}
                  >
                    {heading}
                  </h2>
                )}
                {body !== undefined && (
                  <p
                    className={cn(
                      "max-w-[65ch] text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80",
                      centered ? "text-center" : "",
                    )}
                  >
                    {body}
                  </p>
                )}
              </div>
              {children}
            </div>
          </div>
        );

  return as === "footer"
    ? (
        <footer {...frameProps}>{content}</footer>
      )
    : (
        <section {...frameProps}>{content}</section>
      );
}
