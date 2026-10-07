export type SocialNetwork = "github" | "linkedin";

export interface SocialLink {
  network: SocialNetwork;
  /** Visible label, also the start of the link's accessible name. */
  label: string;
  href: string;
}

/**
 * Tim's profiles: the single source for every link to them on the site. The
 * home 'socials' section lists them in this order.
 */
export const SOCIAL_LINKS: Record<SocialNetwork, SocialLink> = {
  github: { network: "github", label: "GitHub", href: "https://github.com/Tim-van-Oudheusden" },
  linkedin: { network: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/tim-van-oudheusden" },
};
