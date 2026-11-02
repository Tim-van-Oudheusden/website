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
      className="scroll-mt-24 rounded-xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8"
    >
      <h2 id={headingId} className="text-2xl font-semibold tracking-tight">{stratum.heading}</h2>
      <p className="mt-3 max-w-[65ch] text-base leading-relaxed">{stratum.sentence}</p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-base leading-relaxed">
        {stratum.pillars.map((pillar) => (
          <li key={pillar}>{pillar}</li>
        ))}
      </ul>
      <ul aria-label={`Sources for ${stratum.heading}`} className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
