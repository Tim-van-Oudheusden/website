/**
 * Tim's profiles: the single source for every link to them on the site. The
 * home 'socials' section lists them in this order, and the server's schema.org
 * author data names them as `sameAs`.
 *
 * Kept apart from index.ts so the back-end coverage run (which imports only
 * the constants from index.ts) never loads front-end-only data.
 */
export type SocialNetwork = "github" | "linkedin";

export interface SocialLink {
  network: SocialNetwork;
  /** Visible label, also the start of the link's accessible name. */
  label: string;
  href: string;
}

export const SOCIAL_LINKS: Record<SocialNetwork, SocialLink> = {
  github: { network: "github", label: "GitHub", href: "https://github.com/Tim-van-Oudheusden" },
  linkedin: { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/tim-van-oudheusden" },
};
