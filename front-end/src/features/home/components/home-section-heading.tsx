import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";

/** A section's "see all" link. */
export interface HomeSectionLink {
  label: string;
  to: string;
}

interface HomeSectionHeadingProps {
  /** Id the section's `aria-labelledby` points at. */
  headingId: string;
  heading: string;
  /** Muted second line, same size as the heading. */
  subheading: string;
  /** "See all" link beside the heading, or none. */
  link: HomeSectionLink | null;
  /** `center` centres the heading, its second line and the link, stacked. */
  align: "start" | "center";
}

/** One size, tracking and leading for the heading and its second line: hierarchy comes from colour alone. */
const HEADING_TYPE_CLASSES = "text-[1.875rem] leading-[1.1] tracking-[-0.02em] sm:text-[2.5rem]";

/**
 * Kent C. Dodds-style home section heading: an h2 with a muted second line of the same size and, optionally, a
 * "see all" link whose ring draws on hover and keyboard focus. Start-aligned, the link sits below the heading until
 * `lg` and beside it from `lg`.
 */
export function HomeSectionHeading({
  headingId,
  heading,
  subheading,
  link,
  align,
}: HomeSectionHeadingProps): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col gap-10",
        align === "center" ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between",
      )}
    >
      <div className="flex flex-col gap-2 lg:gap-0">
        <h2 id={headingId} className={cn(HEADING_TYPE_CLASSES, "text-(--ink-5) dark:text-(--paper-1)")}>
          {heading}
        </h2>
        <p className={cn(HEADING_TYPE_CLASSES, "text-(--ink-2) dark:text-(--paper-5)")}>
          {subheading}
        </p>
      </div>
      {link === null
        ? null
        : (
            <Link
              to={link.to}
              className="group inline-flex w-fit flex-none items-center gap-8 rounded-full text-[1.375rem] font-medium text-(--ink-5) dark:text-(--paper-1) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--site-accent)"
            >
              {link.label}
              <span aria-hidden="true" className="relative inline-flex size-14 flex-none items-center justify-center">
                <svg viewBox="0 0 60 60" className="absolute inset-0 size-14 -rotate-90">
                  <circle r="28" cx="30" cy="30" fill="none" strokeWidth="2" stroke="currentColor" className="text-(--paper-3) dark:text-(--ink-2)" />
                  <circle
                    r="28"
                    cx="30"
                    cy="30"
                    fill="none"
                    strokeWidth="2"
                    stroke="currentColor"
                    strokeDasharray="175.93"
                    className="text-(--site-accent) [stroke-dashoffset:175.93] transition-[stroke-dashoffset] duration-300 ease-out group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0] motion-reduce:transition-none"
                  />
                </svg>
                <ArrowRight className="size-8 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" />
              </span>
            </Link>
          )}
    </div>
  );
}
