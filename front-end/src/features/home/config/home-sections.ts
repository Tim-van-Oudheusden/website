import { AGENTIC_PAGE_PATH, HERO_LINE } from "shared";
import { SOCIAL_LINKS } from "shared/social-links";

import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

import { EXPERIENCE } from "./experience";

/**
 * Single id-derivation seam: DOM id, heading id, URL hash, nav key, and observer key
 * all project from the section id.
 */
export function headingIdFor(sectionId: HomeSectionId): string {
  return `${sectionId}-heading`;
}

export const HOME_SECTIONS: HomeSectionDefinition[] = [
  {
    id: "start",
    label: "start",
    heading: "Build with Tim.",
    body: HERO_LINE,
    bgColor: "var(--site-page-bg)",
    ctaLabel: "Discover",
    ctaTargetId: "for-you",
    variant: "start",
  },
  {
    id: "for-you",
    label: "for you",
    heading: "For you",
    body: "Picked from the blog, especially for you.",
    bgColor: "var(--site-page-bg)",
    variant: "recommendations",
    linkLabel: "See all articles",
    linkTo: "/articles",
  },
  {
    id: "for-devs",
    label: "for devs",
    heading: "Open-source projects",
    body: "Start with the featured project, then explore the rest on GitHub.",
    bgColor: "var(--site-page-bg)",
    variant: "projects",
    linkLabel: "See all projects",
    linkTo: "/projects",
    featuredSubheading: (featuredTitle) => `Start with ${featuredTitle}, then explore the rest on GitHub.`,
  },
  {
    id: "agentic",
    label: "agentic",
    heading: "Built with agents",
    body: "A hive of AI agents builds this site with me: they pick up GitHub issues and open pull requests, which pass the same checks as mine.",
    bgColor: "var(--site-page-bg)",
    variant: "agentic",
    ctaLabel: "Watch the hive work",
    ctaTo: AGENTIC_PAGE_PATH,
  },
  {
    id: "whats-new",
    label: "what's new",
    heading: "What's new from the blog",
    body: "A handful of the real articles on this site, pulled from the content you can read and linked straight to their pages.",
    bgColor: "var(--site-page-bg)",
    variant: "recent-posts",
  },
  {
    id: "experience",
    label: "experience",
    heading: "Experience",
    body: "Where I have worked so far, newest first.",
    bgColor: "var(--site-page-bg)",
    variant: "experience",
    entries: EXPERIENCE,
    profileUrl: SOCIAL_LINKS.linkedin.href,
  },
  {
    id: "socials",
    label: "socials",
    heading: "Socials",
    body: "Code on GitHub, work history on LinkedIn.",
    bgColor: "var(--site-page-bg)",
    variant: "socials",
    links: Object.values(SOCIAL_LINKS),
  },
];
