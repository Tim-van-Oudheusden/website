import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

import { EXPERIENCE, LINKEDIN_PROFILE_URL } from "./experience";

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
    body: "I'm Tim, a software engineer. I build small, self-hosted tools and write down how they work.",
    bgColor: "var(--adw-page-brown-bg)",
    ctaLabel: "Discover",
    ctaTargetId: "for-you",
    contentDirection: "row",
    variant: "start",
  },
  {
    id: "for-you",
    label: "for you",
    heading: "For you",
    body: "Picked from the blog, especially for you.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "recommendations",
    linkLabel: "See all articles",
    linkTo: "/articles",
  },
  {
    id: "for-devs",
    label: "for devs",
    heading: "Open-source projects",
    body: "Start with the featured project, then explore the rest on GitHub.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "projects",
    linkLabel: "See all projects",
    linkTo: "/projects",
    featuredSubheading: (featuredTitle) => `Start with ${featuredTitle}, then explore the rest on GitHub.`,
  },
  {
    id: "about-me",
    label: "about me",
    heading: "About me",
    // Placeholder copy (#582 D5): Tim writes the final intro and bullets.
    body: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "about",
    aboutItems: [
      "Lorem ipsum dolor",
      "Sit amet, consectetur adipiscing elit",
      "Sed do eiusmod",
      "Tempor incididunt ut labore et dolore magna aliqua",
      "Ut enim ad minim veniam",
      "Quis nostrud exercitation ullamco",
    ],
    imageSrc: "/images/me.png",
    imageAlt: "Portrait of Tim van Oudheusden",
  },
  {
    id: "whats-new",
    label: "what's new",
    heading: "What's new from the blog",
    body: "A handful of the real articles on this site, pulled from the content you can read and linked straight to their pages.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "recent-posts",
  },
  {
    id: "experience",
    label: "experience",
    heading: "Experience",
    body: "Where I have worked so far, newest first.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "column",
    variant: "experience",
    entries: EXPERIENCE,
    profileUrl: LINKEDIN_PROFILE_URL,
  },
  {
    id: "footer",
    label: "inner peace",
    heading: "Reboot With Me",
    body: "Getting your life back on track — from Big Tech independence to inner peace.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "column",
    variant: "footer",
  },
];
