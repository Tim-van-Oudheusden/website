import * as React from "react";
import type { HomeSectionDefinition } from "../types/home-section";

interface HomeSectionProps {
  section: HomeSectionDefinition;
}

export function HomeSection({ section }: HomeSectionProps): React.JSX.Element {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-heading`}
      className="scroll-mt-20 border-border/70 bg-card/70 rounded-3xl border p-6 sm:p-8 lg:min-h-[65svh] lg:p-10"
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col justify-center gap-5">
        <p className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          {section.label}
        </p>
        <h2 id={`${section.id}-heading`} className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {section.heading}
        </h2>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          {section.body}
        </p>
      </div>
    </section>
  );
}
