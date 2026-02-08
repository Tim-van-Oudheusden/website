import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

interface HomeSectionNavProps {
  sections: readonly HomeSectionDefinition[];
  activeSectionId: HomeSectionId;
  onAnchorActivate: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function HomeSectionNav({
  sections,
  activeSectionId,
  onAnchorActivate,
}: HomeSectionNavProps): React.JSX.Element {
  return (
    <aside className="hidden lg:block">
      <nav
        aria-label="On this page"
        className="bg-card/80 border-border/70 sticky top-20 rounded-2xl border p-4"
      >
        <p className="mb-3 text-sm font-semibold tracking-wide uppercase">On this page</p>
        <ul className="space-y-1">
          {sections.map((section) => {
            let linkClassName = "text-muted-foreground hover:text-foreground block rounded-md px-3 py-2 text-sm transition-colors";
            if (section.id === activeSectionId) {
              linkClassName = "bg-secondary text-foreground block rounded-md px-3 py-2 text-sm font-medium";
            }

            let ariaCurrent: React.AriaAttributes["aria-current"];
            if (section.id === activeSectionId) {
              ariaCurrent = "location";
            }

            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={cn(linkClassName)}
                  aria-current={ariaCurrent}
                  onClick={(event) => { onAnchorActivate(section.id, event); }}
                >
                  {section.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
