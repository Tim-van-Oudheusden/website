import * as React from "react";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

interface HomeSectionNavMobileProps {
  sections: readonly HomeSectionDefinition[];
  onAnchorActivate: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function HomeSectionNavMobile({
  sections,
  onAnchorActivate,
}: HomeSectionNavMobileProps): React.JSX.Element {
  return (
    <details className="bg-card/80 border-border/70 sticky top-16 z-20 rounded-2xl border p-4 lg:hidden">
      <summary className="cursor-pointer text-sm font-semibold tracking-wide uppercase">
        Jump to section
      </summary>
      <nav aria-label="On this page" className="mt-3">
        <ul className="space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-muted-foreground hover:text-foreground block rounded-md px-2 py-1.5 text-sm"
                onClick={(event) => { onAnchorActivate(section.id, event); }}
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
