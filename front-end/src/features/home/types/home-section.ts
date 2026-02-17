export type HomeSectionId =
  | "hero"
  | "value-pillars"
  | "feature-strips"
  | "proof"
  | "community-and-docs"
  | "secondary-cta"
  | "footer";

export type HomeSectionContentDirection = "row" | "column";
export type HomeSectionVariant = "default" | "carousel";

export interface HomeSectionDefinition {
  id: HomeSectionId;
  label: string;
  heading: string;
  body: string;
  bgColor: string;
  bgImage?: string;
  ctaLabel?: string;
  ctaTargetId?: HomeSectionId;
  contentDirection: HomeSectionContentDirection;
  variant?: HomeSectionVariant;
}
