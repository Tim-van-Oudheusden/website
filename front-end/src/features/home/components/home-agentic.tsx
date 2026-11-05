import "@/features/agentic/flexoki.css";

import "./home-agentic.css";

import { ArrowRight } from "lucide-react";
import type { CSSProperties, JSX } from "react";
import { Link } from "react-router";

import { AGENTIC_COPY } from "@/features/agentic/config/agentic-copy";

import { headingIdFor } from "../config/home-sections";
import type { HomeAgenticSection } from "../types/home-section";

import { HOME_SECTION_FRAME_CLASSES, HomeSectionFrame } from "./home-section-shell";

/** Pointy-top hexagon circumradius of the honeycomb decoration, in SVG units. */
const HEX_R = 30;
const HEX_W = Math.sqrt(3) * HEX_R;

/** Honeycomb cells; odd rows shift half a cell. Cells with a `glow` order light up in that order. */
const HONEYCOMB: readonly { col: number; row: number; glow: number | null }[] = [
  { col: 2, row: 0, glow: null },
  { col: 3, row: 0, glow: 0 },
  { col: 4, row: 0, glow: null },
  { col: 1, row: 1, glow: null },
  { col: 2, row: 1, glow: 1 },
  { col: 3, row: 1, glow: null },
  { col: 4, row: 1, glow: 2 },
  { col: 2, row: 2, glow: null },
  { col: 3, row: 2, glow: 3 },
  { col: 4, row: 2, glow: null },
  { col: 3, row: 3, glow: null },
  { col: 4, row: 3, glow: 4 },
];

const HEX_POINTS = Array.from({ length: 6 }, (_, corner) => {
  const angle = (Math.PI / 3) * corner - Math.PI / 2;

  return `${(HEX_R * Math.cos(angle)).toFixed(2)},${(HEX_R * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/** Decoration: a patch of honeycomb whose lit cells breathe one after another. */
function Honeycomb(): JSX.Element {
  return (
    <svg className="ha-honeycomb" viewBox="0 0 260 200" aria-hidden="true" focusable="false">
      {HONEYCOMB.map(({ col, row, glow }) => {
        const x = col * HEX_W + (row % 2 === 1 ? HEX_W / 2 : 0) - HEX_W / 2;
        const y = HEX_R + row * HEX_R * 1.5;

        return (
          <g key={`${String(col)}-${String(row)}`} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`}>
            <polygon
              className="ha-cell"
              data-lit={glow === null ? undefined : true}
              points={HEX_POINTS}
              style={glow === null ? undefined : ({ "--ha-i": glow } as CSSProperties)}
            />
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
 * breathes in the corner, and a single call to action opens the tab. Motion only runs without reduced motion.
 */
export function HomeAgentic({ section }: HomeAgenticProps): JSX.Element {
  return (
    <HomeSectionFrame section={section} as="section" className={HOME_SECTION_FRAME_CLASSES}>
      <div className="home-agentic w-full max-w-6xl rounded-[2rem] lg:max-w-332">
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
                <li key={entry.id} className="ha-stop" style={{ "--ha-i": index } as CSSProperties}>
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
