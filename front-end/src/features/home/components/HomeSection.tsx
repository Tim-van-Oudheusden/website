import * as React from "react";
import { cn } from "@/shared/lib/utils";
import type { HomeSectionDefinition } from "../types/home-section";

interface HomeSectionProps {
  section: HomeSectionDefinition;
}

export function HomeSection({ section }: HomeSectionProps): React.JSX.Element {
  const isRow = section.contentDirection === "row";

  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="flex min-h-svh scroll-mt-20 items-center justify-center px-6 py-12 sm:px-10 sm:py-16"
      style={{
        backgroundColor: section.bgColor,
        ...(section.bgImage != null
          ? {
              backgroundImage: `url(${section.bgImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}),
      }}
    >
      <div
        className={cn(
          "flex max-w-2xl flex-col gap-8 md:max-w-3xl lg:max-w-5xl",
          isRow ? "md:flex-row md:items-center" : "",
        )}
      >
        <div className="flex flex-1 flex-col gap-5">
          <p className="text-sm font-medium tracking-wide uppercase text-white/70">
            {section.label}
          </p>
          <h2 id={`${section.id}-heading`} className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {section.heading}
          </h2>
          <p className="leading-relaxed text-white/80">
            {section.body}
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center rounded-2xl bg-white/10 p-8">
          <p className="text-sm text-white/50">Media placeholder</p>
        </div>
      </div>
    </section>
  );
}
