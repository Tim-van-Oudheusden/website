import { ArrowUpRight } from "lucide-react";
import type { ComponentType, JSX, SVGProps } from "react";

import { SITE_OWNER } from "shared";
import type { SocialNetwork } from "shared/social-links";

import { GitHubIcon } from "@/shared/components/icons/github-icon";
import { LinkedInIcon } from "@/shared/components/icons/linkedin-icon";
import { Button } from "@/shared/components/ui/button";

import type { HomeSocialsSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

const SOCIAL_ICONS: Record<SocialNetwork, ComponentType<SVGProps<SVGSVGElement>>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
};

/** The repository behind this site, kept as a secondary link (#585 D2). */
const SITE_SOURCE_HREF = "https://github.com/Tim-van-Oudheusden/website";

/** Outline pill in the site's neutral tokens, matching the project showcase's call to action. */
const SOCIAL_LINK_CLASSES = "h-12 gap-3 rounded-full border-(--paper-3) bg-(--paper-2) px-5 text-base text-(--ink-5) shadow-none transition-colors duration-150 has-[>svg]:px-5 hover:border-(--ink-1) hover:bg-(--paper-1) hover:text-(--ink-5) dark:border-(--ink-2) dark:bg-(--popover) dark:text-(--paper-1) dark:hover:border-(--paper-3) dark:hover:bg-white/10 dark:hover:text-(--paper-1) motion-reduce:transition-none";

interface HomeSocialsProps {
  section: HomeSocialsSection;
}

/**
 * Home 'socials' variant, the page's semantic footer, centered: one labelled
 * link per profile (official marks, monochrome), then the copyright line and a
 * link to this site's source.
 */
export function HomeSocials({ section }: HomeSocialsProps): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <HomeHeadedSectionShell as="footer" section={section} heading={section.heading} body={section.body} headingAlign="center">
      <div className="flex flex-col items-center gap-10">
        <ul className="flex flex-wrap justify-center gap-3">
          {section.links.map((link) => {
            const Icon = SOCIAL_ICONS[link.network];

            return (
              <li key={link.network}>
                <Button asChild variant="outline" size="lg" className={SOCIAL_LINK_CLASSES}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${link.label} (opens in a new tab)`}>
                    <Icon className="size-5" />
                    {link.label}
                  </a>
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-(--ink-5)/60 dark:text-white/60">
          <p>
            ©
            {" "}
            {currentYear}
            {" "}
            {SITE_OWNER}
          </p>
          <a
            href={SITE_SOURCE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source of this site (opens in a new tab)"
            className="inline-flex items-center gap-1 underline-offset-4 transition-colors duration-150 hover:text-(--ink-5) hover:underline focus-visible:text-(--ink-5) dark:hover:text-(--paper-1) dark:focus-visible:text-(--paper-1) motion-reduce:transition-none"
          >
            Source of this site
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </HomeHeadedSectionShell>
  );
}
