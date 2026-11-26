import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import { AtSign, Bot, BriefcaseBusiness, CodeXml, House, Newspaper, UserRound } from "lucide-react";
import type { CSSProperties, JSX, MouseEvent } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { Badge } from "@/shared/components/ui/badge";

import type { IndicatorInsets } from "../lib/home-floating-nav-indicator";
import { calculateIndicatorInsets, indicatorClipPath } from "../lib/home-floating-nav-indicator";
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
  "agentic": Bot,
  "whats-new": Newspaper,
  "experience": BriefcaseBusiness,
  "socials": AtSign,
};

/** Row layout shared by the list and its overlay copy, so each copied label sits exactly over its link. */
const NAV_ROW_CLASSES = "flex gap-2 p-3";

/** Label box shared by each link and its overlay copy. */
const NAV_LABEL_CLASSES = "px-4 py-2 text-base uppercase tracking-[0.08em]";

interface IndicatorState {
  insets: IndicatorInsets | null;
  /** Only a move to another section slides; first paint and re-measures (resize, font swap) jump. */
  animate: boolean;
}

export function HomeFloatingNav({
  sections,
  activeSectionId,
  onAnchorActivate,
}: HomeFloatingNavProps): JSX.Element {
  const navListRef = useRef<HTMLUListElement | null>(null);
  const navItemsRef = useRef<Partial<Record<HomeSectionId, HTMLAnchorElement | null>>>({});
  const measuredSectionIdRef = useRef(activeSectionId);
  const [indicator, setIndicator] = useState<IndicatorState>({ insets: null, animate: false });

  const measureIndicator = useCallback((animate: boolean) => {
    const navListElement = navListRef.current;
    const activeNavItemElement = navItemsRef.current[measuredSectionIdRef.current];

    if (navListElement === null || activeNavItemElement === null || activeNavItemElement === undefined) {
      setIndicator({ insets: null, animate: false });

      return;
    }

    const listRect = navListElement.getBoundingClientRect();
    const insets = calculateIndicatorInsets(
      {
        left: listRect.left,
        top: listRect.top,
        width: listRect.width,
        height: listRect.height,
        clientLeft: navListElement.clientLeft,
        clientTop: navListElement.clientTop,
        clientWidth: navListElement.clientWidth,
        clientHeight: navListElement.clientHeight,
        offsetWidth: navListElement.offsetWidth,
        offsetHeight: navListElement.offsetHeight,
      },
      activeNavItemElement.getBoundingClientRect(),
    );

    setIndicator((previous) => ({ insets, animate: animate && previous.insets !== null }));
  }, []);

  // Measured before paint, so the highlight is in place on the first frame.
  useLayoutEffect(() => {
    const moved = measuredSectionIdRef.current !== activeSectionId;

    measuredSectionIdRef.current = activeSectionId;
    measureIndicator(moved);
  }, [activeSectionId, sections, measureIndicator]);

  useEffect(() => {
    const navListElement = navListRef.current;
    let disposed = false;

    function remeasure(): void {
      if (!disposed) {
        measureIndicator(false);
      }
    }

    const resizeObserver = new ResizeObserver(remeasure);

    if (navListElement !== null) {
      resizeObserver.observe(navListElement);
    }

    window.addEventListener("resize", remeasure);
    // Labels narrow when the web fonts swap in (`font-display: swap`).
    void document.fonts.ready.then(remeasure);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      window.removeEventListener("resize", remeasure);
    };
  }, [measureIndicator]);

  const indicatorStyle: CSSProperties = indicator.insets === null
    ? { opacity: 0 }
    : { opacity: 1, clipPath: indicatorClipPath(indicator.insets) };

  return (
    <nav
      aria-label="Page sections"
      className="fixed bottom-0 left-0 right-0 z-50 hidden sm:flex items-center justify-center px-4 pb-8"
    >
      <ul
        ref={navListRef}
        className={cn(
          "relative",
          NAV_ROW_CLASSES,
          "rounded-2xl border border-(--paper-4) dark:border-(--ink-2) bg-background dark:bg-(--site-section-well-bg) shadow-lg backdrop-blur-md",
        )}
      >
        {sections.map((section) => {
          const Icon = HOME_NAV_ICONS[section.id];

          return (
            <li key={section.id}>
              <Badge
                asChild
                variant="ghost"
                className={cn(
                  NAV_LABEL_CLASSES,
                  "bg-transparent text-(--popover-foreground) transition-colors [a&]:hover:bg-transparent [a&]:hover:text-(--popover-foreground)",
                )}
              >
                <a
                  href={`#${section.id}`}
                  ref={(element) => {
                    navItemsRef.current[section.id] = element;
                  }}
                  aria-current={section.id === activeSectionId ? "location" : undefined}
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
        {/* The highlight: the labels in the active colours, clipped to the active item; fill and text move as one. */}
        <span
          aria-hidden="true"
          data-slot="active-indicator"
          className={cn(
            "pointer-events-none absolute inset-0 z-10 select-none",
            NAV_ROW_CLASSES,
            "bg-(--ink-5) dark:bg-(--paper-1) text-white dark:text-(--ink-5)",
            indicator.animate && "transition-[clip-path] duration-250 ease-in-out motion-reduce:transition-none",
          )}
          style={indicatorStyle}
        >
          {sections.map((section) => {
            const Icon = HOME_NAV_ICONS[section.id];

            return (
              <span key={section.id} className="block">
                <Badge variant="ghost" className={NAV_LABEL_CLASSES}>
                  <Icon className="size-4" aria-hidden="true" />
                  {section.label}
                </Badge>
              </span>
            );
          })}
        </span>
      </ul>
    </nav>
  );
}
