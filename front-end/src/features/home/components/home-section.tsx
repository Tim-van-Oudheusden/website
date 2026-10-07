import type { JSX, MouseEvent } from "react";

import type { ContentLoader } from "@/shared/lib/content-loader";

import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

import { HomeRecentPosts } from "./home-recent-posts";
import { HomeRecommendations } from "./home-recommendations";
import { HomeSectionFooter } from "./home-section-footer";
import { HomeSectionStart } from "./home-section-start";
import { HomeStartHere } from "./home-start-here";
import { HomeTrustStrip } from "./home-trust-strip";
import { HomeWorkflowRows } from "./home-workflow-rows";

export interface HomeSectionProps {
  section: HomeSectionDefinition;
  onCtaActivate: (sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void;
  /** Content source for the sections that list real articles. */
  loader: ContentLoader;
}

/** Dispatches a home section definition to the renderer responsible for its variant. */
export function HomeSection({ section, onCtaActivate, loader }: HomeSectionProps): JSX.Element {
  switch (section.variant) {
    case "start":
      return <HomeSectionStart section={section} onCtaActivate={onCtaActivate} />;
    case "footer":
      return <HomeSectionFooter section={section} />;
    case "recommendations":
      return <HomeRecommendations section={section} loader={loader} />;
    case "workflow":
      return <HomeWorkflowRows section={section} />;
    case "trust":
      return <HomeTrustStrip section={section} />;
    case "recent-posts":
      return <HomeRecentPosts section={section} loader={loader} />;
    case "start-here":
      return <HomeStartHere section={section} loader={loader} />;
    default: {
      const unhandled: never = section;

      throw new Error(`Unhandled home section variant: ${JSON.stringify(unhandled)}`);
    }
  }
}
