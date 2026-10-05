import type { JSX, MouseEvent } from "react";

import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

import { HomeRecentPosts } from "./home-recent-posts";
import { HomeSectionCarousel } from "./home-section-carousel";
import { HomeSectionDefault } from "./home-section-default";
import { HomeSectionFooter } from "./home-section-footer";
import { HomeSectionStart } from "./home-section-start";
import { HomeStartHere } from "./home-start-here";
import { HomeTrustStrip } from "./home-trust-strip";
import { HomeWorkflowRows } from "./home-workflow-rows";

export interface HomeSectionProps {
  section: HomeSectionDefinition;
  onCtaActivate?: (sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Dispatches a home section definition to the renderer responsible for its
 * variant. The default-variant `start` section renders as a hero.
 */
export function HomeSection({ section, onCtaActivate }: HomeSectionProps): JSX.Element {
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
