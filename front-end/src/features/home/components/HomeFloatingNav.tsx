import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

interface HomeFloatingNavProps {
  sections: readonly HomeSectionDefinition[];
  activeSectionId: HomeSectionId;
  onAnchorActivate: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function HomeFloatingNav({
  sections,
  activeSectionId,
  onAnchorActivate,
}: HomeFloatingNavProps): React.JSX.Element {
  return (
    <nav
      aria-label="Page sections"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-4 pb-4"
    >
      <ul className="bg-background/80 border-border/50 flex gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur-md">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;

          return (
            <li key={section.id}>
              <Badge
                asChild
                variant={isActive ? "default" : "secondary"}
              >
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => { onAnchorActivate(section.id, event); }}
                >
                  {section.label}
                </a>
              </Badge>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
