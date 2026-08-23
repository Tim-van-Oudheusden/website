export type HomeSectionId =
  | "start"
  | "for-you"
  | "for-devs"
  | "proof"
  | "community-and-docs"
  | "secondary-cta"
  | "footer";

export type HomeSectionContentDirection = "row" | "column";
export type HomeSectionVariant = "default" | "carousel" | "footer";
export type HomeSectionSurfaceVariant = "default" | "white-well";

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
  surfaceVariant?: HomeSectionSurfaceVariant;
}
