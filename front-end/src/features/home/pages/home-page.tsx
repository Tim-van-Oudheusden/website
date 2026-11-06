import type { JSX, MouseEvent } from "react";
import { useState } from "react";

import { MAIN_CONTENT_ID } from "@/shared/components/skip-link";
import { useDocumentTitle } from "@/shared/hooks/use-document-title";
import { httpContentLoader, shareArticleList } from "@/shared/lib/content-loader";

import { HomeFloatingNav } from "../components/home-floating-nav";
import { HomeSection } from "../components/home-section";
import { HOME_SECTIONS } from "../config/home-sections";
import { useActiveHomeSection } from "../hooks/use-active-home-section";
import { resolveAnchorScrollBehavior } from "../lib/home-section-nav-scroll";
import type { HomeSectionId } from "../types/home-section";

/** A primary-button click with no modifier; any other click keeps the browser's own action (new tab, window...). */
function isPlainPrimaryClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

function activateSectionAnchor(sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>): void {
  if (!isPlainPrimaryClick(event)) {
    return;
  }

  const targetElement = document.getElementById(sectionId);

  if (targetElement === null) {
    return;
  }

  event.preventDefault();

  targetElement.scrollIntoView({
    behavior: resolveAnchorScrollBehavior(window.matchMedia.bind(window)),
    block: "start",
  });

  const fragment = `#${sectionId}`;

  window.history.replaceState(null, "", fragment);
}

export function HomePage(): JSX.Element {
  const sectionIds = HOME_SECTIONS.map((section) => section.id);
  const activeSectionId = useActiveHomeSection(sectionIds);
  // One article-list request per page visit, shared by every section that lists articles.
  const [loader] = useState(() => shareArticleList(httpContentLoader));

  useDocumentTitle(null);

  return (
    <main id={MAIN_CONTENT_ID} className="flex-1 scroll-smooth motion-reduce:scroll-auto">
      {HOME_SECTIONS.map((section) => (
        <HomeSection
          key={section.id}
          section={section}
          onCtaActivate={activateSectionAnchor}
          loader={loader}
        />
      ))}
      <HomeFloatingNav
        sections={HOME_SECTIONS}
        activeSectionId={activeSectionId}
        onAnchorActivate={activateSectionAnchor}
      />
    </main>
  );
}
