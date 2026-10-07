import { ArrowUpRight } from "lucide-react";
import type { ComponentType, JSX, SVGProps } from "react";

import { GitHubIcon } from "@/shared/components/icons/github-icon";
import { LinkedInIcon } from "@/shared/components/icons/linkedin-icon";
import { Button } from "@/shared/components/ui/button";
import type { SocialNetwork } from "@/shared/config/social-links";

import type { HomeSocialsSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

const SOCIAL_ICONS: Record<SocialNetwork, ComponentType<SVGProps<SVGSVGElement>>> = {
  github: GitHubIcon,
  linkedin: LinkedInIcon,
};

/** The repository behind this site, kept as a secondary link (#585 D2). */
const SITE_SOURCE_HREF = "https://github.com/Tim-van-Oudheusden/website";
const SITE_AUTHOR = "Tim van Oudheusden";

/** Outline pill in Adwaita colours, matching the project showcase's call to action. */
const SOCIAL_LINK_CLASSES = "h-12 gap-3 rounded-full border-(--adw-light-3) bg-(--adw-light-2) px-5 text-base text-(--adw-dark-5) shadow-none transition-colors duration-150 has-[>svg]:px-5 hover:border-(--adw-dark-1) hover:bg-(--adw-light-1) hover:text-(--adw-dark-5) dark:border-(--adw-dark-2) dark:bg-(--adw-headerbar-bg-color) dark:text-(--adw-light-1) dark:hover:border-(--adw-light-3) dark:hover:bg-white/10 dark:hover:text-(--adw-light-1) motion-reduce:transition-none";

interface HomeSocialsProps {
  section: HomeSocialsSection;
}

/**
 * Home 'socials' variant, the page's semantic footer: one labelled link per
 * profile (official marks, monochrome), then the copyright line and a link to
 * this site's source.
 */
export function HomeSocials({ section }: HomeSocialsProps): JSX.Element {
  const currentYear = new Date().getFullYear();

  return (
    <HomeHeadedSectionShell as="footer" section={section} heading={section.heading} body={section.body}>
      <div className="flex flex-col gap-10">
        <ul className="flex flex-wrap gap-3">
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
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-(--adw-dark-5)/60 dark:text-white/60">
          <p>
            ©
            {" "}
            {currentYear}
            {" "}
            {SITE_AUTHOR}
          </p>
          <a
            href={SITE_SOURCE_HREF}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source of this site (opens in a new tab)"
            className="inline-flex items-center gap-1 underline-offset-4 transition-colors duration-150 hover:text-(--adw-dark-5) hover:underline focus-visible:text-(--adw-dark-5) dark:hover:text-(--adw-light-1) dark:focus-visible:text-(--adw-light-1) motion-reduce:transition-none"
          >
            Source of this site
            <ArrowUpRight aria-hidden="true" className="size-3.5" />
          </a>
        </div>
      </div>
    </HomeHeadedSectionShell>
  );
}
