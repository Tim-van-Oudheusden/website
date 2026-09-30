import * as React from "react";

interface HomeTrustStripProps {
  sectionId: string;
  headingId: string;
  heading: string;
  body: string;
  bgColor: string;
  items: string[];
}

/**
 * Lightweight honest trust strip for the home proof section.
 *
 * Renders a short, centered stack of verifiable low-claims statements. It
 * deliberately renders no metrics, testimonials, or compatibility badges —
 * the site is young, so credibility comes from stating only what holds.
 */
export function HomeTrustStrip({
  sectionId,
  headingId,
  heading,
  body,
  bgColor,
  items,
}: HomeTrustStripProps): React.JSX.Element {
  return (
    <section
      id={sectionId}
      aria-labelledby={headingId}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
      style={{ backgroundColor: bgColor }}
    >
      <div className="w-full">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 md:max-w-3xl lg:max-w-296">
          <div className="flex flex-1 flex-col items-center gap-4">
            <h2
              id={headingId}
              className="text-center font-semibold tracking-tight text-(--adw-dark-5) dark:text-(--adw-light-1) text-[1.75rem] sm:text-[2rem]"
            >
              {heading}
            </h2>
            <p className="max-w-[65ch] text-center text-base sm:text-lg leading-relaxed text-(--adw-dark-5) dark:text-white/80">
              {body}
            </p>
          </div>
          <ul className="flex flex-col items-center gap-3">
            {items.map((item) => (
              <li
                key={item}
                className="w-fit rounded-full bg-(--site-section-well-bg) px-5 py-2 border border-white/15 text-(--adw-dark-5) dark:text-white/85 text-base"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}