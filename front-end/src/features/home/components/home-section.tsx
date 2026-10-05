import * as React from "react";
import type { HomeSectionId } from "../types/home-section";
import type { HomeSectionDefinition } from "../types/home-section";
import { HomeSectionFooter } from "./home-section-footer";
import { HomeSectionCarousel } from "./home-section-carousel";
import { HomeSectionStart } from "./home-section-start";
import { HomeSectionDefault } from "./home-section-default";
import { HomeTrustStrip } from "./home-trust-strip";
import { HomeWorkflowRows } from "./home-workflow-rows";
import { HomeRecentPosts } from "./home-recent-posts";
import { HomeStartHere } from "./home-start-here";

export interface HomeSectionProps {
  section: HomeSectionDefinition;
  onCtaActivate?: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Dispatches a home section definition to the renderer responsible for its
 * variant. The default-variant `start` section renders as a hero.
 */
export function HomeSection({ section, onCtaActivate }: HomeSectionProps): React.JSX.Element {
  switch (section.variant) {
    case "start":
      return <HomeSectionStart section={section} onCtaActivate={onCtaActivate} />;
    case "footer":
      return <HomeSectionFooter section={section} />;
    case "carousel":
      return <HomeSectionCarousel section={section} />;
    case "workflow":
      return <HomeWorkflowRows section={section} />;
    case "trust":
      return <HomeTrustStrip section={section} />;
    case "recent-posts":
      return <HomeRecentPosts section={section} />;
    case "start-here":
      return <HomeStartHere section={section} />;
    default:
      return <HomeSectionDefault section={section} onCtaActivate={onCtaActivate} />;
  }
}
