import "@/features/agentic/flexoki.css";

import "./home-agentic.css";

import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import type { JSX } from "react";
import { Link } from "react-router";

import { AGENTIC_COPY } from "@/features/agentic/config/agentic-copy";
import { SITE_WELL_BLEED_CLASSES } from "@/shared/lib/content-edge";

import { headingIdFor } from "../config/home-sections";
import type { HomeAgenticSection } from "../types/home-section";

import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";

/** Pointy-top hexagon circumradius of the honeycomb decoration, in SVG units. */
const HEX_R = 30;
const HEX_W = Math.sqrt(3) * HEX_R;

/** Honeycomb cells; odd rows shift half a cell. */
const HONEYCOMB: readonly { col: number; row: number; lit: boolean }[] = [
  { col: 2, row: 0, lit: false },
  { col: 3, row: 0, lit: true },
  { col: 4, row: 0, lit: false },
  { col: 1, row: 1, lit: false },
  { col: 2, row: 1, lit: true },
  { col: 3, row: 1, lit: false },
  { col: 4, row: 1, lit: true },
  { col: 2, row: 2, lit: false },
  { col: 3, row: 2, lit: true },
  { col: 4, row: 2, lit: false },
  { col: 3, row: 3, lit: false },
  { col: 4, row: 3, lit: true },
];

const HEX_POINTS = Array.from({ length: 6 }, (_, corner) => {
  const angle = (Math.PI / 3) * corner - Math.PI / 2;

  return `${(HEX_R * Math.cos(angle)).toFixed(2)},${(HEX_R * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/** Decoration: a patch of honeycomb with a few lit cells. */
function Honeycomb(): JSX.Element {
  return (
    <svg className="ha-honeycomb" viewBox="0 0 260 200" aria-hidden="true" focusable="false">
      {HONEYCOMB.map(({ col, row, lit }) => {
        const x = col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0) - HEX_W / 2;
        const y = HEX_R + row * HEX_R * 1.5;

        return (
          <g key={`${String(col)}-${String(row)}`} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
            <polygon className="ha-cell" data-lit={lit ? true : undefined} points={HEX_POINTS} />
          </g>
        );
      })}
    </svg>
  );
}

interface HomeAgenticProps {
  section: HomeAgenticSection;
}

/**
 * Home 'agentic' section: a teaser for the Agentic tab in the home page's rounded well, lit like the tab itself.
 * The tab's flow of work runs along a glowing honey conduit with light pulses travelling to "live", a honeycomb
 * glows in the corner, and a single call to action opens the tab. Motion only runs without reduced motion.
 */
export function HomeAgentic({ section }: HomeAgenticProps): JSX.Element {
  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      {/* The well reaches past the content edge by the fixed well bleed and pads its copy back onto it. */}
      <div className={cn("home-agentic rounded-[2rem]", SITE_WELL_BLEED_CLASSES)}>
        <Honeycomb />
        <div className="ha-body">
          <p className="ha-eyebrow" aria-hidden="true">
            <span>issue</span>
            <span className="ha-eyebrow-flow" />
            <span>live</span>
          </p>
          <h2 id={headingIdFor(section.id)} className="ha-title">{section.heading}</h2>
          <p className="ha-intro">{section.body}</p>
          <div className="ha-route">
            <span className="ha-conduit" aria-hidden="true">
              <span className="ha-pulse" />
              <span className="ha-pulse" />
            </span>
            <ol className="ha-stops" aria-label="How a change goes from issue to live">
              {AGENTIC_COPY.flow.map((entry, index) => (
                <li key={entry.id} className="ha-stop">
                  <span className="ha-node" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span className="ha-step">{entry.step}</span>
                </li>
              ))}
            </ol>
            <span className="ha-live" aria-hidden="true">live</span>
          </div>
          <Link to={section.ctaTo} className="ha-cta">
            {section.ctaLabel}
            <ArrowRight aria-hidden="true" className="ha-cta-arrow size-5" />
          </Link>
        </div>
      </div>
    </HomeSectionFrame>
  );
}
