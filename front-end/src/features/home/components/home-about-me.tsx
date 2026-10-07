import type { JSX } from "react";

import { headingIdFor } from "../config/home-sections";
import type { HomeAboutSection } from "../types/home-section";

import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";

interface HomeAboutMeProps {
  section: HomeAboutSection;
}

/**
 * Home 'about-me' section: heading, intro and a brick wall of short facts on
 * the left, the portrait on the right (below the bricks when stacked).
 *
 * Each fact is a brick sized by its own text; bricks wrap and grow to fill
 * their row, so every row spans the container and the joints fall in
 * different places, like a wall.
 */
export function HomeAboutMe({ section }: HomeAboutMeProps): JSX.Element {
  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="mx-auto grid w-full max-w-2xl gap-10 md:max-w-3xl lg:max-w-296 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-center lg:gap-16">
        <div className="flex min-w-0 flex-col gap-6">
          <h2
            id={headingIdFor(section.id)}
            className="text-[1.875rem] leading-tight sm:text-[2.5rem] text-(--adw-dark-5) dark:text-(--adw-light-1)"
          >
            {section.heading}
          </h2>
          <p className="max-w-[65ch] text-lg leading-relaxed text-(--adw-dark-2) dark:text-(--adw-light-5)">
            {section.body}
          </p>
          <ul className="flex flex-wrap gap-2 rounded-[2rem] bg-(--site-section-well-bg) p-4 shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] sm:gap-3 sm:p-6">
            {section.aboutItems.map((item) => (
              <li
                key={item}
                className="flex max-w-full min-w-0 grow items-baseline gap-2 rounded-md border border-(--adw-light-3) bg-(--adw-light-2) px-3 py-2 text-[0.9375rem] text-(--adw-dark-5) dark:border-white/20 dark:bg-white/10 dark:text-(--adw-light-1) sm:gap-2.5 sm:px-4 sm:py-2.5 sm:text-base"
              >
                <span aria-hidden="true" className="size-1.5 flex-none translate-y-[-0.15em] rounded-full bg-(--adw-accent-color)" />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] bg-(--site-section-well-bg) shadow-[inset_0_1px_3px_rgba(0,0,0,0.12)] lg:max-w-none">
          <img src={section.imageSrc} alt={section.imageAlt} loading="lazy" className="aspect-2/3 w-full object-cover" />
        </div>
      </div>
    </HomeSectionFrame>
  );
}
