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
    body: "I'm Tim, a software engineer. I build small, self-hosted tools and write down how they work.",
    bgColor: "var(--site-page-bg)",
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
    bgColor: "var(--site-page-bg)",
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
    bgColor: "var(--site-page-bg)",
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
    body: "I'm a senior software engineer at Gemeente Tilburg, moving the city's digital forms onto Docker and Azure DevOps pipelines. Before that I built cloud platforms on AWS at DebitRoom. Off the clock I tinker with Linux and share what I learn in articles here.",
    bgColor: "var(--site-page-bg)",
    contentDirection: "row",
    variant: "about",
    aboutItems: [
      "Software engineer since 2019",
      "DevOps with Docker, Kubernetes, AWS and Azure",
      "On Linux since 2022",
      "Bazzite on the desktop, Bluefin on my Framework 13",
      "Taking notes in Obsidian since 2020",
      "Building a minimal Android launcher",
      "Graduated cum laude",
      "Yoga Nidra to stay calm in chaos",
    ],
    imageSrc: "/images/me.png",
    imageAlt: "Portrait of Tim van Oudheusden",
  },
  {
    id: "whats-new",
    label: "what's new",
    heading: "What's new from the blog",
    body: "A handful of the real articles on this site, pulled from the content you can read and linked straight to their pages.",
    bgColor: "var(--site-page-bg)",
    contentDirection: "row",
    variant: "recent-posts",
  },
  {
    id: "experience",
    label: "experience",
    heading: "Experience",
    body: "Where I have worked so far, newest first.",
    bgColor: "var(--site-page-bg)",
    contentDirection: "column",
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
    contentDirection: "column",
    variant: "socials",
    links: Object.values(SOCIAL_LINKS),
  },
];
