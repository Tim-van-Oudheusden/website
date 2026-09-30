import * as React from "react";
import type { HomeSectionDefinition } from "../types/home-section";

const SITE_GITHUB_HREF = "https://github.com/Tim-van-Oudheusden/website";
const SITE_AUTHOR = "Tim van Oudheusden";

interface HomeSectionFooterProps {
  section: HomeSectionDefinition;
}

/** Home 'footer' variant: semantic footer with site identification + copyright. */
export function HomeSectionFooter({ section }: HomeSectionFooterProps): React.JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"
      style={{ backgroundColor: section.bgColor }}
    >
      <div className="w-full">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-296">
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
          </div>
          <div className="flex flex-col gap-4">
            <a
              href={SITE_GITHUB_HREF}
              rel="noopener noreferrer"
              target="_blank"
              className="text-sm underline-offset-4 text-(--adw-dark-5) dark:text-white/80 hover:text-(--adw-dark-4) dark:hover:text-white/70"
            >
              GitHub
            </a>
            <p
              className="text-sm text-(--adw-dark-5)/60 dark:text-white/60"
            >
              © {currentYear} {SITE_AUTHOR}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}