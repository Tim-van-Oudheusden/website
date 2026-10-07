export type HomeSectionId
  = | "start"
    | "for-you"
    | "for-devs"
    | "proof"
    | "community-and-docs"
    | "secondary-cta"
    | "footer";

export type HomeSectionContentDirection = "row" | "column";

interface HomeSectionBase {
  id: HomeSectionId;
  label: string;
  heading: string;
  body: string;
  bgColor: string;
  contentDirection: HomeSectionContentDirection;
}

export interface HomeStartSection extends HomeSectionBase {
  variant: "start";
  ctaLabel: string;
  ctaTargetId: HomeSectionId;
}

export interface HomeRecommendationsSection extends HomeSectionBase {
  variant: "recommendations";
  /** Label of the "see all" link beside the heading. */
  linkLabel: string;
  /** Route the "see all" link opens. */
  linkTo: string;
}

export interface HomeProjectsSection extends HomeSectionBase {
  variant: "projects";
  /** Label of the "see all" link beside the heading. */
  linkLabel: string;
  /** Route the "see all" link opens. */
  linkTo: string;
  /** Subheading once the featured project is known; `body` shows until then. */
  featuredSubheading: (featuredTitle: string) => string;
}

export interface HomeTrustSection extends HomeSectionBase {
  variant: "trust";
  /** Honest, verifiable claims shown as the commitment strip. */
  trustItems: string[];
}

export interface HomeRecentPostsSection extends HomeSectionBase {
  variant: "recent-posts";
}

export interface HomeStartHereSection extends HomeSectionBase {
  variant: "start-here";
}

export interface HomeFooterSection extends HomeSectionBase {
  variant: "footer";
}

export type HomeSectionDefinition
  = | HomeStartSection
    | HomeRecommendationsSection
    | HomeProjectsSection
    | HomeTrustSection
    | HomeRecentPostsSection
    | HomeStartHereSection
    | HomeFooterSection;

export type HomeSectionVariant = HomeSectionDefinition["variant"];
