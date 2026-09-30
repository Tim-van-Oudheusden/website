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
    case "footer":
      return <HomeSectionFooter section={section} />;
    case "carousel":
      return <HomeSectionCarousel section={section} />;
    case "workflow":
      return (
        <HomeWorkflowRows
          sectionId={section.id}
          headingId={`${section.id}-heading`}
          heading={section.heading}
          body={section.body}
          bgColor={section.bgColor}
          features={section.features ?? []}
        />
      );
    case "trust":
      return (
        <HomeTrustStrip
          sectionId={section.id}
          headingId={`${section.id}-heading`}
          heading={section.heading}
          body={section.body}
          bgColor={section.bgColor}
          items={section.trustItems ?? []}
        />
      );
    case "recent-posts":
      return (
        <HomeRecentPosts
          sectionId={section.id}
          headingId={`${section.id}-heading`}
          heading={section.heading}
          body={section.body}
          bgColor={section.bgColor}
        />
      );
    case "start-here":
      return (
        <HomeStartHere
          sectionId={section.id}
          headingId={`${section.id}-heading`}
          heading={section.heading}
          body={section.body}
          bgColor={section.bgColor}
        />
      );
    default:
      if (section.id === "start") {
        return <HomeSectionStart section={section} onCtaActivate={onCtaActivate} />;
      }

      return <HomeSectionDefault section={section} onCtaActivate={onCtaActivate} />;
  }
}