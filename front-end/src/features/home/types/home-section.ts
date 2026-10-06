export type HomeSectionId
  = | "start"
    | "for-you"
    | "for-devs"
    | "proof"
    | "community-and-docs"
    | "secondary-cta"
    | "footer";

export type HomeSectionContentDirection = "row" | "column";

/** Whether the carousel sits inside the raised section well or directly on the section background. */
export type HomeCarouselFrame = "well" | "bare";

/** One pairing of a real tool with what it enables, used by the for-devs workflow section. */
export interface HomeFeatureRow {
  title: string;
  /** What the tool enables. */
  description: string;
  /** Short label for the empty media placeholder slot beside the row. */
  mediaLabel: string;
}

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

export interface HomeCarouselSection extends HomeSectionBase {
  variant: "carousel";
  carouselFrame: HomeCarouselFrame;
}

export interface HomeWorkflowSection extends HomeSectionBase {
  variant: "workflow";
  /** Real capability/workflow rows. */
  features: HomeFeatureRow[];
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
    | HomeCarouselSection
    | HomeWorkflowSection
    | HomeTrustSection
    | HomeRecentPostsSection
    | HomeStartHereSection
    | HomeFooterSection;

export type HomeSectionVariant = HomeSectionDefinition["variant"];
