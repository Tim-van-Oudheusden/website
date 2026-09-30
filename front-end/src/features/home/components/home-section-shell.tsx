import * as React from "react";
import type { HomeSectionDefinition } from "../types/home-section";

interface HomeSectionShellProps {
  section: HomeSectionDefinition;
  className?: string;
  children: React.ReactNode;
}

/**
 * Shared section frame: owns the section id, `aria-labelledby` wiring, and the
 * bgColor/bgImage surface so variant renderers stay about content only.
 */
export function HomeSectionShell({
  section,
  className,
  children,
}: HomeSectionShellProps): React.JSX.Element {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className={className ?? "flex min-h-svh items-center justify-center px-6 py-12 sm:px-10 sm:py-16 lg:px-6"}
      style={{
        backgroundColor: section.bgColor,
        ...(section.bgImage !== undefined
          ? {
              backgroundImage: `url(${section.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      {children}
    </section>
  );
}