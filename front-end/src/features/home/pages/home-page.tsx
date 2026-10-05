import type { JSX, MouseEvent } from "react";

import { HomeFloatingNav } from "../components/home-floating-nav";
import { HomeSection } from "../components/home-section";
import { HOME_SECTIONS } from "../config/home-sections";
import { useActiveHomeSection } from "../hooks/use-active-home-section";
import { resolveAnchorScrollBehavior } from "../lib/home-section-nav-scroll";
import type { HomeSectionId } from "../types/home-section";

function activateSectionAnchor(sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>): void {
  if (typeof document === "undefined") {
    return;
  }

  const targetElement = document.getElementById(sectionId);

  if (targetElement === null) {
    return;
  }

  event.preventDefault();

  let matchMediaFn: ((query: string) => { matches: boolean }) | null = null;

  if (typeof window !== "undefined") {
    matchMediaFn = window.matchMedia.bind(window);
  }

  targetElement.scrollIntoView({
    behavior: resolveAnchorScrollBehavior(matchMediaFn),
    block: "start",
  });

  if (typeof window === "undefined") {
    return;
  }

  const fragment = `#${sectionId}`;

  window.history.replaceState(null, "", fragment);
}

export function HomePage(): JSX.Element {
  const sectionIds = HOME_SECTIONS.map((section) => section.id);
  const activeSectionId = useActiveHomeSection(sectionIds);

  return (
    <main className="flex-1 scroll-smooth motion-reduce:scroll-auto">
      {HOME_SECTIONS.map((section) => (
        <HomeSection key={section.id} section={section} onCtaActivate={activateSectionAnchor} />
      ))}
      <HomeFloatingNav
        sections={HOME_SECTIONS}
        activeSectionId={activeSectionId}
        onAnchorActivate={activateSectionAnchor}
      />
    </main>
  );
}
