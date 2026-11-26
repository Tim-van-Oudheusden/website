import { useEffect, useState } from "react";

import type { HomeSectionId } from "../types/home-section";

export interface ObservedSectionEntry {
  id: string;
  isIntersecting: boolean;
}

/** The sections inside the activation band after one batch of observer reports, applied in the order they came. */
export function sectionsInBand(previous: ReadonlySet<string>, entries: readonly ObservedSectionEntry[]): Set<string> {
  const next = new Set(previous);

  for (const entry of entries) {
    if (entry.isIntersecting) {
      next.add(entry.id);
    } else {
      next.delete(entry.id);
    }
  }

  return next;
}

/**
 * The current section: the one in the activation band, or the later one in page order while a boundary between two
 * sits in it. With no section in the band the current one stays.
 */
export function selectActiveSectionId(
  inBand: ReadonlySet<string>,
  validSectionIds: readonly HomeSectionId[],
  currentActiveSectionId: HomeSectionId,
): HomeSectionId {
  for (let index = validSectionIds.length - 1; index >= 0; index--) {
    const id = validSectionIds[index];

    if (id !== undefined && inBand.has(id)) {
      return id;
    }
  }

  return currentActiveSectionId;
}

export function useActiveHomeSection(sectionIds: readonly HomeSectionId[]): HomeSectionId {
  const firstSectionId = sectionIds[0];

  if (firstSectionId === undefined) {
    throw new Error("useActiveHomeSection requires at least one section id");
  }

  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>(firstSectionId);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observedElements: Element[] = [];
    let inBand = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        const reports = entries.map((entry) => ({ id: entry.target.id, isIntersecting: entry.isIntersecting }));
        const band = sectionsInBand(inBand, reports);

        inBand = band;

        setActiveSectionId((current) => selectActiveSectionId(band, sectionIds, current));
      },
      // A 1%-high band 40% down the viewport: the section crossing it is current. Ratio thresholds of the whole
      // section would never fire for a section several screens tall, and sections tile the page, so one always
      // holds the band.
      {
        root: null,
        rootMargin: "-40% 0px -59% 0px",
        threshold: 0,
      },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);

      if (element === null) {
        continue;
      }

      observedElements.push(element);
      observer.observe(element);
    }

    return () => {
      for (const element of observedElements) {
        observer.unobserve(element);
      }

      observer.disconnect();
    };
  }, [sectionIds]);

  return activeSectionId;
}
