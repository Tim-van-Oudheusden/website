import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";

interface HomeSectionHeadingProps {
  /** Id the section's `aria-labelledby` points at. */
  headingId: string;
  heading: string;
  /** Muted second line, same size as the heading. */
  subheading: string;
  linkLabel: string;
  linkTo: string;
}

/**
 * Kent C. Dodds-style home section heading: an h2 with a muted subheading of the
 * same size, and a "see all" link whose ring draws on hover and keyboard focus.
 * Stacked below `lg`, one row from `lg`.
 */
export function HomeSectionHeading({
  headingId,
  heading,
  subheading,
  linkLabel,
  linkTo,
}: HomeSectionHeadingProps): JSX.Element {
  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex flex-col gap-2 lg:gap-0">
        <h2 id={headingId} className="text-[1.875rem] leading-tight sm:text-[2.5rem] text-(--adw-dark-5) dark:text-(--adw-light-1)">
          {heading}
        </h2>
        <p className="text-[1.875rem] leading-tight sm:text-[2.5rem] text-(--adw-dark-2) dark:text-(--adw-light-5)">
          {subheading}
        </p>
      </div>
      <Link
        to={linkTo}
        className="group inline-flex w-fit flex-none items-center gap-8 rounded-full text-[1.375rem] font-medium text-(--adw-dark-5) dark:text-(--adw-light-1) focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--adw-accent-color)"
      >
        {linkLabel}
        <span aria-hidden="true" className="relative inline-flex size-14 flex-none items-center justify-center">
          <svg viewBox="0 0 60 60" className="absolute inset-0 size-14 -rotate-90">
            <circle r="28" cx="30" cy="30" fill="none" strokeWidth="2" stroke="currentColor" className="text-(--adw-light-3) dark:text-(--adw-dark-2)" />
            <circle
              r="28"
              cx="30"
              cy="30"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              strokeDasharray="175.93"
              className="text-(--adw-accent-color) [stroke-dashoffset:175.93] transition-[stroke-dashoffset] duration-500 ease-out group-hover:[stroke-dashoffset:0] group-focus-visible:[stroke-dashoffset:0] motion-reduce:transition-none"
            />
          </svg>
          <ArrowRight className="size-8 transition-transform duration-300 group-hover:translate-x-1 group-focus-visible:translate-x-1 motion-reduce:transition-none" />
        </span>
      </Link>
    </div>
  );
}
