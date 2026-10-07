import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

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
    heading: "How I work",
    body: "Read the real stack behind the site: a note-driven Obsidian pipeline, a container-OS desktop, and a Pi sandbox that keeps everything running.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "workflow",
    features: [
      {
        title: "Obsidian content pipeline",
        description: "Articles start as notes in an Obsidian vault and publish through one repeatable pipeline, from the same tools used to write and stay organised.",
        mediaLabel: "Vault to article",
      },
      {
        title: "Container-OS desktop",
        description: "The operating system runs as a container image (Bazzite / Bluefin) — portability, isolation and recovery without a heavy rebuild.",
        mediaLabel: "Desktop as container",
      },
      {
        title: "Pi sandbox automation",
        description: "This site builds and verifies itself inside a sandbox managed from a tiny Raspberry Pi — self-hosted tooling over big-cloud defaults.",
        mediaLabel: "Sandboxed build",
      },
    ],
  },
  {
    id: "proof",
    label: "conquer",
    heading: "Proof, honestly",
    body: "This site is young, so it does not invent metrics, testimonials, or compatibility claims. It only states what is true.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "column",
    variant: "trust",
    trustItems: [
      "Open source, from the repo to every article file",
      "Self-hosted and independent of any Big Tech platform",
      "Linux-native, built on a container-OS desktop",
      "Produced with an Obsidian pipeline and a Pi sandbox",
      "Steadied by meditation, mindful work, and inner peace",
    ],
  },
  {
    id: "community-and-docs",
    label: "strengthen",
    heading: "What's new from the blog",
    body: "A handful of the real articles on this site, pulled from the content you can read and linked straight to their pages.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "row",
    variant: "recent-posts",
  },
  {
    id: "secondary-cta",
    label: "independence",
    heading: "Start here",
    body: "Four posts that give the fastest honest read of what this site is about.",
    bgColor: "var(--adw-page-brown-bg)",
    contentDirection: "column",
    variant: "start-here",
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
