import type { JSX } from "react";

import type { HomeTrustSection } from "../types/home-section";

import { HomeHeadedSectionShell } from "./home-section-shell";

interface HomeTrustStripProps {
  section: HomeTrustSection;
}

/**
 * Lightweight honest trust strip for the home proof section.
 *
 * Renders a short, centered stack of verifiable low-claims statements. It
 * deliberately renders no metrics, testimonials, or compatibility badges —
 * the site is young, so credibility comes from stating only what holds.
 */
export function HomeTrustStrip({ section }: HomeTrustStripProps): JSX.Element {
  return (
    <HomeHeadedSectionShell as="section" section={section} heading={section.heading} body={section.body} centered>
      <ul className="flex flex-col items-center gap-3">
        {section.trustItems.map((item) => (
          <li
            key={item}
            className="w-fit rounded-full bg-(--site-section-well-bg) px-5 py-2 border border-white/15 text-(--adw-dark-5) dark:text-white/85 text-base"
          >
            {item}
          </li>
        ))}
      </ul>
    </HomeHeadedSectionShell>
  );
}
