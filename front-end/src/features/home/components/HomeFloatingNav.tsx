import * as React from "react";
import {
  CodeXml,
  Dumbbell,
  House,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

interface HomeFloatingNavProps {
  sections: readonly HomeSectionDefinition[];
  activeSectionId: HomeSectionId;
  onAnchorActivate: (sectionId: HomeSectionId, event: React.MouseEvent<HTMLAnchorElement>) => void;
}

const HOME_NAV_ICONS: Record<HomeSectionId, LucideIcon> = {
  hero: House,
  "value-pillars": UserRound,
  "feature-strips": CodeXml,
  proof: Trophy,
  "community-and-docs": Dumbbell,
  "secondary-cta": ShieldCheck,
  footer: Sparkles,
};

export function HomeFloatingNav({
  sections,
  activeSectionId,
  onAnchorActivate,
}: HomeFloatingNavProps): React.JSX.Element {
  return (
    <nav
      aria-label="Page sections"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center px-4 pb-8"
    >
      <ul className="flex gap-2 rounded-2xl border border-[var(--adw-light-4)] bg-background/60 p-3 shadow-lg backdrop-blur-md">
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          const Icon = HOME_NAV_ICONS[section.id];

          return (
            <li key={section.id}>
              <Badge
                asChild
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "px-4 py-2 text-base uppercase tracking-[0.08em]",
                  isActive
                    ? ""
                    : "bg-transparent text-[var(--adw-headerbar-fg-color)] [a&]:hover:bg-transparent",
                )}
              >
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => { onAnchorActivate(section.id, event); }}
                >
                  <Icon className="size-4" aria-hidden="true" />
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
