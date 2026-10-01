export type HomeSectionId =
  | "start"
  | "for-you"
  | "for-devs"
  | "proof"
  | "community-and-docs"
  | "secondary-cta"
  | "footer";

export type HomeSectionContentDirection = "row" | "column";
export type HomeSectionVariant = "default" | "start" | "carousel" | "footer" | "workflow" | "trust" | "recent-posts" | "start-here";
export type HomeSectionSurfaceVariant = "default" | "white-well";

/** One pairing of a real tool with what it enables, used by the for-devs workflow section. */
export interface HomeFeatureRow {
  title: string;
  /** What the tool enables. */
  description: string;
  /** Short label for the empty media placeholder slot beside the row. */
  mediaLabel: string;
}

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
  /** Real capability/workflow rows for the "workflow" section. */
  features?: HomeFeatureRow[];
  /** Honest, verifiable claims shown as the "trust" commitment strip. */
  trustItems?: string[];
}
