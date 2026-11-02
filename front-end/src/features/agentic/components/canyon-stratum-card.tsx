import type { JSX } from "react";

import type { CanyonStratum } from "../config/canyon-strata";

/**
 * One stratum's text: heading, sentence, pillars and source links. It sits on
 * the solid card surface so it stays readable over any frame of the scene.
 */
export function CanyonStratumCard({ stratum }: { stratum: CanyonStratum }): JSX.Element {
  const headingId = `${stratum.id}-heading`;

  return (
    <section
      id={stratum.id}
      aria-labelledby={headingId}
      className="scroll-mt-24 rounded-xl border bg-card p-4 text-card-foreground shadow-sm sm:p-8"
    >
      <h2 id={headingId} className="text-lg font-semibold tracking-tight sm:text-2xl">{stratum.heading}</h2>
      <p className="mt-1 max-w-[65ch] text-sm leading-snug sm:mt-3 sm:text-base sm:leading-relaxed">{stratum.sentence}</p>
      <ul className="mt-2 list-disc pl-4 text-sm leading-snug sm:mt-4 sm:space-y-1 sm:pl-5 sm:text-base sm:leading-relaxed">
        {stratum.pillars.map((pillar) => (
          <li key={pillar}>{pillar}</li>
        ))}
      </ul>
      <ul aria-label={`Sources for ${stratum.heading}`} className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs sm:mt-5 sm:gap-x-4 sm:gap-y-2 sm:text-sm">
        {stratum.sourceLinks.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className="font-mono underline underline-offset-4 hover:text-(--site-accent)"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
