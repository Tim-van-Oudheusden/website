export type HomeSectionId
  = | "start"
    | "for-you"
    | "for-devs"
    | "about-me"
    | "whats-new"
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

export interface HomeAboutSection extends HomeSectionBase {
  variant: "about";
  /** Short facts, each shown as one brick in the brick wall. */
  aboutItems: string[];
  imageSrc: string;
  imageAlt: string;
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
    | HomeAboutSection
    | HomeRecentPostsSection
    | HomeStartHereSection
    | HomeFooterSection;

export type HomeSectionVariant = HomeSectionDefinition["variant"];
