import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { CodeXml, House, IdCard, Newspaper, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import type { CSSProperties, JSX, MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";

import type { IndicatorMetrics } from "../lib/home-floating-nav-indicator";
import { calculateIndicatorMetrics } from "../lib/home-floating-nav-indicator";
import type { HomeSectionDefinition, HomeSectionId } from "../types/home-section";

interface HomeFloatingNavProps {
  sections: readonly HomeSectionDefinition[];
  activeSectionId: HomeSectionId;
  onAnchorActivate: (sectionId: HomeSectionId, event: MouseEvent<HTMLAnchorElement>) => void;
}

const HOME_NAV_ICONS: Record<HomeSectionId, LucideIcon> = {
  "start": House,
  "for-you": UserRound,
  "for-devs": CodeXml,
  "about-me": IdCard,
  "whats-new": Newspaper,
  "secondary-cta": ShieldCheck,
  "footer": Sparkles,
};

export function HomeFloatingNav({
  sections,
  activeSectionId,
  onAnchorActivate,
}: HomeFloatingNavProps): JSX.Element {
  const navListRef = useRef<HTMLUListElement | null>(null);
  const navItemsRef = useRef<Partial<Record<HomeSectionId, HTMLAnchorElement | null>>>({});
  const [indicatorMetrics, setIndicatorMetrics] = useState<IndicatorMetrics | null>(null);

  const updateIndicatorMetrics = useCallback(() => {
    const navListElement = navListRef.current;
    const activeNavItemElement = navItemsRef.current[activeSectionId];

    if (navListElement === null || activeNavItemElement === null || activeNavItemElement === undefined) {
      setIndicatorMetrics(null);

      return;
    }

    setIndicatorMetrics(
      calculateIndicatorMetrics(
        navListElement.getBoundingClientRect(),
        activeNavItemElement.getBoundingClientRect(),
      ),
    );
  }, [activeSectionId]);

  useEffect(() => {
    updateIndicatorMetrics();

    if (typeof window === "undefined") {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(updateIndicatorMetrics);

    function handleResize(): void {
      updateIndicatorMetrics();
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [updateIndicatorMetrics]);

  const indicatorStyle: CSSProperties = indicatorMetrics === null
    ? {
        opacity: 0,
        transform: "translate3d(0px, 0px, 0px)",
        width: "0px",
        height: "0px",
      }
    : {
        opacity: 1,
        transform: `translate3d(${indicatorMetrics.translateX}px, ${indicatorMetrics.translateY}px, 0px)`,
        width: `${indicatorMetrics.width}px`,
        height: `${indicatorMetrics.height}px`,
      };

  return (
    <nav
      aria-label="Page sections"
      className="fixed bottom-0 left-0 right-0 z-50 hidden sm:flex items-center justify-center px-4 pb-8"
    >
      <ul
        ref={navListRef}
        className="relative flex gap-2 rounded-2xl border border-(--adw-light-4) bg-background dark:bg-(--site-section-well-bg) p-3 shadow-lg backdrop-blur-md"
      >
        <span
          aria-hidden="true"
          data-slot="active-indicator"
          className="pointer-events-none absolute top-0 left-0 rounded-full bg-(--adw-dark-5) transition-[transform,width] duration-300 ease-out motion-reduce:transition-none"
          style={indicatorStyle}
        />
        {sections.map((section) => {
          const isActive = section.id === activeSectionId;
          const Icon = HOME_NAV_ICONS[section.id];

          return (
            <li key={section.id} className="relative z-10">
              <Badge
                asChild
                variant="ghost"
                className={cn(
                  "px-4 py-2 text-base uppercase tracking-[0.08em] transition-colors [a&]:hover:bg-transparent",
                  isActive
                    ? "text-white dark:text-(--adw-light-1) [a&]:hover:text-white dark:[a&]:hover:text-(--adw-light-1)"
                    : "bg-transparent text-(--adw-headerbar-fg-color) [a&]:hover:text-(--adw-headerbar-fg-color)",
                )}
              >
                <a
                  href={`#${section.id}`}
                  ref={(element) => {
                    navItemsRef.current[section.id] = element;
                  }}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(event) => {
                    onAnchorActivate(section.id, event);
                  }}
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
