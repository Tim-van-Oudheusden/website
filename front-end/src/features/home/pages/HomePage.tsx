import * as React from "react";
import type { HomeSectionId } from "../types/home-section";
import { HOME_SECTIONS } from "../config/home-sections";
import { HomeSection } from "../components/HomeSection";
import { HomeSectionNav } from "../components/HomeSectionNav";
import { HomeSectionNavMobile } from "../components/HomeSectionNavMobile";
import { resolveAnchorScrollBehavior } from "../components/home-section-nav-scroll";
import { useActiveHomeSection } from "../hooks/useActiveHomeSection";

function activateSectionAnchor(sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>): void {
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

export function HomePage(): React.JSX.Element {
  const sectionIds = HOME_SECTIONS.map((section) => section.id);
  const activeSectionId = useActiveHomeSection(sectionIds);

  return (
    <main className="flex-1 scroll-smooth motion-reduce:scroll-auto">
      <div className="from-background via-background to-muted/40 min-h-full bg-gradient-to-b">
        <div className="mx-auto grid max-w-screen-xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8 lg:px-8 lg:py-10">
          <div className="space-y-6 sm:space-y-8">
            <HomeSectionNavMobile sections={HOME_SECTIONS} onAnchorActivate={activateSectionAnchor} />
            {HOME_SECTIONS.map((section) => (
              <HomeSection key={section.id} section={section} />
            ))}
          </div>
          <HomeSectionNav
            sections={HOME_SECTIONS}
            activeSectionId={activeSectionId}
            onAnchorActivate={activateSectionAnchor}
          />
        </div>
      </div>
    </main>
  );
}
