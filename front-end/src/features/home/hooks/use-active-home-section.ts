import { useEffect, useState } from "react";

import type { HomeSectionId } from "../types/home-section";

export interface ObservedSectionEntry {
  id: string;
  isIntersecting: boolean;
  intersectionRatio: number;
}

export function selectActiveSectionId(
  entries: ObservedSectionEntry[],
  validSectionIds: readonly HomeSectionId[],
  currentActiveSectionId: HomeSectionId,
): HomeSectionId {
  let candidateId = currentActiveSectionId;
  let candidateRatio = 0;

  for (const entry of entries) {
    if (!entry.isIntersecting) {
      continue;
    }

    if (!validSectionIds.includes(entry.id as HomeSectionId)) {
      continue;
    }

    if (entry.intersectionRatio <= candidateRatio) {
      continue;
    }

    candidateRatio = entry.intersectionRatio;
    candidateId = entry.id as HomeSectionId;
  }

  return candidateId;
}

export function useActiveHomeSection(sectionIds: readonly HomeSectionId[]): HomeSectionId {
  const firstSectionId = sectionIds[0];

  if (firstSectionId === undefined) {
    throw new Error("useActiveHomeSection requires at least one section id");
  }

  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>(firstSectionId);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observedElements: Element[] = [];

    const observer = new IntersectionObserver(
      (entries) => {
        const normalizedEntries: ObservedSectionEntry[] = entries.map((entry) => ({
          id: entry.target.id,
          isIntersecting: entry.isIntersecting,
          intersectionRatio: entry.intersectionRatio,
        }));

        setActiveSectionId((current) => selectActiveSectionId(normalizedEntries, sectionIds, current));
      },
      {
        root: null,
        rootMargin: "-96px 0px -40% 0px",
        threshold: [0.2, 0.4, 0.6, 0.8],
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
