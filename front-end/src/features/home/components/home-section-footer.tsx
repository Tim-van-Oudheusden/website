import type { JSX } from "react";

import type { HomeSectionDefinition } from "../types/home-section";

import { HomeSectionShell } from "./home-section-shell";

const SITE_GITHUB_HREF = "https://github.com/Tim-van-Oudheusden/website";
const SITE_AUTHOR = "Tim van Oudheusden";

interface HomeSectionFooterProps {
  section: HomeSectionDefinition;
}

/** Home 'footer' variant: semantic footer with site identification + copyright. */
export function HomeSectionFooter({ section }: HomeSectionFooterProps): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <HomeSectionShell as="footer" section={section} heading={section.heading} body={section.body}>
      <div className="flex flex-col gap-4">
        <a
          href={SITE_GITHUB_HREF}
          rel="noopener noreferrer"
          target="_blank"
          className="text-sm underline-offset-4 text-(--adw-dark-5) dark:text-white/80 hover:text-(--adw-dark-4) dark:hover:text-white/70"
        >
          GitHub
        </a>
        <p className="text-sm text-(--adw-dark-5)/60 dark:text-white/60">
          ©
          {" "}
          {currentYear}
          {" "}
          {SITE_AUTHOR}
        </p>
      </div>
    </HomeSectionShell>
  );
}
