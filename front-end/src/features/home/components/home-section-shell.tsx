import type { JSX, ReactNode } from "react";

import { SITE_CONTENT_CONTAINER_CLASSES } from "@/shared/lib/content-edge";

import { headingIdFor } from "../config/home-sections";
import type { HomeSectionDefinition } from "../types/home-section";

import type { HomeSectionLink } from "./home-section-heading";
import { HomeSectionHeading } from "./home-section-heading";

/** The frame's height and vertical rhythm; inline padding belongs to the content column inside it. */
export const HOME_SECTION_FRAME_CLASSES
  = "flex min-h-[calc(100svh-var(--site-top-bar-height))] scroll-mt-(--site-top-bar-height) items-center justify-center py-12 sm:py-16";

export type HomeSectionFrameElement = "section" | "footer";

interface HomeSectionFrameProps {
  section: HomeSectionDefinition;
  /** Render the frame as a semantic `<footer>` instead of `<section>`. */
  as: HomeSectionFrameElement;
  className: string;
  children: ReactNode;
}

/**
 * Single section frame for every variant: owns the section id, `aria-labelledby`
 * (single-sourced from `headingIdFor`), the bgColor surface and the content
 * column, whose inline padding puts every section on the site's one content
 * edge, the top bar's logo included. Variants that render their own heading
 * markup use the frame directly; the rest go through `HomeHeadedSectionShell`,
 * which renders the shared heading.
 */
export function HomeSectionFrame({ section, as, className, children }: HomeSectionFrameProps): JSX.Element {
  const frameProps = {
    "id": section.id,
    "aria-labelledby": headingIdFor(section.id),
    className,
    "style": { backgroundColor: section.bgColor },
  };
  const content = <div className={SITE_CONTENT_CONTAINER_CLASSES}>{children}</div>;

  return as === "footer"
    ? (
        <footer {...frameProps}>{content}</footer>
      )
    : (
        <section {...frameProps}>{content}</section>
      );
}

interface HomeHeadedSectionShellProps {
  section: HomeSectionDefinition;
  as: HomeSectionFrameElement;
  heading: string;
  /** Muted second line of the heading. */
  subheading: string;
  link: HomeSectionLink | null;
  /** Alignment of the heading block only; variants align their own content. */
  headingAlign: "start" | "center";
  children: ReactNode;
}

/** Section frame with the shared section heading rendered above the variant content. */
export function HomeHeadedSectionShell({
  section,
  as,
  heading,
  subheading,
  link,
  headingAlign,
  children,
}: HomeHeadedSectionShellProps): JSX.Element {
  return (
    <HomeSectionFrame section={section} as={as} className={HOME_SECTION_FRAME_CLASSES}>
      <div className="flex flex-col gap-10 lg:gap-12">
        <HomeSectionHeading
          headingId={headingIdFor(section.id)}
          heading={heading}
          subheading={subheading}
          link={link}
          align={headingAlign}
        />
        {children}
      </div>
    </HomeSectionFrame>
  );
}
