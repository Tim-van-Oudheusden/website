import type { JSX } from "react";
import { createElement, Fragment, useId } from "react";

import { SITE_NAME } from "shared";

import type { CanyonColour, CanyonComposition, CanyonLine, CanyonNode } from "../config/canyon-art";
import { CANYON_DESKTOP } from "../config/canyon-art-desktop";
import { CANYON_PHONE } from "../config/canyon-art-phone";
import type { CanyonStratum } from "../config/canyon-strata";
import { CANYON_STRATA } from "../config/canyon-strata";

/** A project that flies a flag on the rim. */
export interface CanyonSceneProject {
  slug: string;
  title: string;
}

export interface CanyonSceneProps {
  /** How many strata, from the rim down, the water has uncovered. */
  revealed: number;
  /** Published projects, newest first; one flag each. */
  projects: readonly CanyonSceneProject[];
}

/** Flag colours in turn; paper text on each is at least 6:1. */
const FLAG_COLOURS: readonly CanyonColour[] = ["blue-600", "green-700", "purple-600"];

/** Each tablet hangs at its own slight angle, like a hand-pinned tag. */
const TABLET_TILT: readonly number[] = [-1.6, 1.2, -0.8, 1.5, -1.2, 0.9];

type Point = readonly [number, number];

function colour(name: CanyonColour): string {
  return `var(--canyon-${name})`;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function polygon(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${String(round(x))},${String(round(y))}`).join(" ")}Z`;
}

/** The width the scene's labels take, estimated like the round-2 frames do. */
function textWidth(label: string, size: number, bold: boolean): number {
  return label.length * size * (bold ? 0.56 : 0.5);
}

function translate(x: number, y: number): string {
  return `translate(${String(round(x))},${String(round(y))})`;
}

function Line({ line }: { line: CanyonLine }): JSX.Element {
  return (
    <path
      d={line.d}
      style={{ fill: "none", stroke: colour(line.stroke) }}
      strokeWidth={line.strokeWidth}
      strokeLinecap={line.linecap ?? undefined}
      strokeLinejoin={line.linejoin ?? undefined}
      strokeDasharray={line.dash ?? undefined}
      opacity={line.opacity}
      transform={line.transform ?? undefined}
    />
  );
}

/** One node of the drawing. Its children are static, so they go in as arguments and need no keys. */
function drawNode(node: CanyonNode): JSX.Element {
  if ("children" in node) {
    return createElement(
      "g",
      {
        "data-layer": node.layer ?? undefined,
        "data-tone": node.tone ?? undefined,
        "data-only": node.only ?? undefined,
        "data-twinkle": node.twinkle ?? undefined,
        "transform": node.transform ?? undefined,
      },
      ...node.children.map(drawNode),
    );
  }

  if ("stroke" in node) {
    return <Line line={node} />;
  }

  return (
    <path
      d={node.d}
      style={{ fill: colour(node.fill) }}
      opacity={node.opacity}
      transform={node.transform ?? undefined}
    />
  );
}

function drawNodes(nodes: readonly CanyonNode[]): JSX.Element {
  return createElement(Fragment, null, ...nodes.map(drawNode));
}

/** A sheet with its offset paper shadow, like every cut shape in the scene. */
function Sheet({ d, fill, shadow }: { d: string; fill: CanyonColour; shadow: Point }): JSX.Element {
  return (
    <>
      <path d={d} style={{ fill: colour("ink") }} opacity={0.3} transform={translate(shadow[0], shadow[1])} />
      <path d={d} style={{ fill: colour(fill) }} />
    </>
  );
}

interface RimLabels {
  sign: { x: number; y: number; width: number; height: number; fontSize: number };
  stilts: string;
  pole: { d: string; x: number; top: number } | null;
  flags: { project: CanyonSceneProject; d: string; textX: number; textY: number; colour: CanyonColour }[];
  fontSize: number;
}

/** Lays out the site sign on the bridge and one pennant per project on the right-rim pole. */
function rimLabels(art: CanyonComposition, projects: readonly CanyonSceneProject[]): RimLabels {
  const { centreX, rimTop, signFontSize, poleX, flagFontSize } = art.labels;
  const s = art.scale;
  const midY = rimTop - 10 * s;
  const signWidth = textWidth(SITE_NAME, signFontSize, true) + 28 * s;
  const signHeight = signFontSize * 1.8;
  const signX = centreX - signWidth / 2;
  const signY = midY + 16 * s - signHeight - 6 * s;
  const stilts = [centreX - signWidth * 0.35, centreX + signWidth * 0.35]
    .map((x) => polygon([
      [x - 0.8, signY + signHeight],
      [x + 0.8, signY + signHeight],
      [x + 0.8, midY + 18 * s],
      [x - 0.8, midY + 18 * s],
    ]))
    .join("");
  const flagHeight = flagFontSize * 1.75;
  const step = flagHeight + 7 * s;
  const poleTop = rimTop - (projects.length * step + 26 * s);
  const pole = projects.length === 0
    ? null
    : {
        d: polygon([
          [poleX - 2.5 * s, rimTop + 2],
          [poleX + 2.5 * s, rimTop + 2],
          [poleX + 2 * s, poleTop],
          [poleX - 2 * s, poleTop],
        ]),
        x: poleX,
        top: poleTop,
      };
  const flags = projects.map((project, index) => {
    const y = poleTop + 8 * s + index * step;
    const x1 = poleX - 3 * s;
    const x0 = x1 - (textWidth(project.title, flagFontSize, false) + 30 * s);
    const wave = 3 * s * (index % 2 === 1 ? 1 : -1);

    return {
      project,
      d: polygon([
        [x1, y],
        [x0 + 4 * s, y + wave],
        [x0 + 12 * s, y + flagHeight / 2],
        [x0 + 4 * s, y + flagHeight + wave],
        [x1, y + flagHeight],
      ]),
      textX: round((x0 + 12 * s + x1) / 2),
      textY: round(y + flagHeight * 0.68 + wave * 0.3),
      colour: FLAG_COLOURS[index % FLAG_COLOURS.length] ?? "blue-600",
    };
  });

  return {
    sign: { x: signX, y: signY, width: signWidth, height: signHeight, fontSize: signFontSize },
    stilts,
    pole,
    flags,
    fontSize: flagFontSize,
  };
}

function Tablet({ art, stratum, index, revealed }: {
  art: CanyonComposition;
  stratum: CanyonStratum;
  index: number;
  revealed: boolean;
}): JSX.Element | null {
  const anchor = art.tablets[index];

  if (anchor === undefined) {
    return null;
  }

  const s = art.scale;
  const { fontSize, gap } = art.tablet;
  const height = fontSize * 2.05;
  const width = textWidth(stratum.heading, fontSize, true) + 26 * s + 6;
  const x = anchor.side === "right"
    ? Math.min(anchor.edgeX + gap, art.width - width - 5)
    : Math.max(anchor.edgeX - gap - width, 5);
  const y = anchor.centreY - height / 2;
  const box = { x: round(x), y: round(y), width: round(width), height: round(height), rx: 3 };
  const tilt = `rotate(${String(TABLET_TILT[index] ?? 0)} ${String(round(x + width / 2))} ${String(anchor.centreY)})`;

  return (
    <g data-tablet={stratum.id} data-revealed={revealed}>
      <g transform={tilt}>
        <rect {...box} style={{ fill: colour("ink") }} opacity={0.35} transform={translate(4 * s, 6 * s)} />
        <rect {...box} style={{ fill: colour("paper") }} />
        <circle
          cx={round(x + 9 * s + 1)}
          cy={round(y + 8 * s + 1)}
          r={round(3.5 * Math.max(s, 0.6))}
          style={{ fill: colour(anchor.pin) }}
        />
        <text x={round(x + width / 2 + 4 * s)} y={round(anchor.centreY + fontSize * 0.36)} fontSize={fontSize} fontWeight={700} textAnchor="middle" style={{ fill: colour("ink") }}>
          {stratum.heading}
        </text>
      </g>
    </g>
  );
}

function Composition({ art, name, revealed, projects }: CanyonSceneProps & {
  art: CanyonComposition;
  name: "desktop" | "phone";
}): JSX.Element {
  const clipId = `${useId()}-ripples`;
  const labels = rimLabels(art, projects);
  const s = art.scale;
  const { sign } = labels;
  const reflectedRim = [
    polygon([
      [sign.x, sign.y],
      [sign.x + sign.width, sign.y],
      [sign.x + sign.width, sign.y + sign.height],
      [sign.x, sign.y + sign.height],
    ]),
    labels.pole?.d ?? "",
    ...labels.flags.map((flag) => flag.d),
  ].join("");

  return (
    <svg
      data-composition={name}
      className={name === "phone" ? "sm:hidden" : "hidden sm:block"}
      viewBox={`0 0 ${String(art.width)} ${String(art.height)}`}
      preserveAspectRatio="xMidYMid slice"
      focusable="false"
    >
      <defs>
        <clipPath id={clipId}>
          <path d={art.reflection.ripples} />
        </clipPath>
      </defs>
      {drawNodes(art.back)}
      <g data-layer="hoodoos">
        {CANYON_STRATA.map((stratum, stratumIndex) => {
          const slots = art.hoodoos[stratumIndex] ?? [];

          // One hoodoo per pillar item: the drawing has a slot for each, in config order.
          return slots.map((slot, slotIndex) => {
            const pillar = stratum.pillars[slotIndex] ?? "";

            return <g key={`${stratum.id}:${pillar}`} data-pillar={pillar}>{drawNodes(slot)}</g>;
          });
        })}
      </g>
      <g data-layer="rim">
        {drawNodes(art.rim)}
        <path d={labels.stilts} style={{ fill: colour("orange-900") }} />
        {labels.pole === null
          ? null
          : (
              <>
                <Sheet d={labels.pole.d} fill="orange-900" shadow={[2 * s, 3 * s]} />
                <circle cx={labels.pole.x} cy={round(labels.pole.top - 2 * s)} r={round(4 * s)} style={{ fill: colour("ink") }} opacity={0.3} transform={translate(1, 2)} />
                <circle cx={labels.pole.x} cy={round(labels.pole.top - 2 * s)} r={round(4 * s)} style={{ fill: colour("yellow-300") }} />
              </>
            )}
      </g>
      {drawNodes(art.tints)}
      <g data-layer="rim-labels">
        <g data-site-name="true">
          <rect x={round(sign.x)} y={round(sign.y)} width={round(sign.width)} height={round(sign.height)} rx={round(6 * s)} style={{ fill: colour("ink") }} opacity={0.35} transform={translate(3 * s, 4 * s)} />
          <rect x={round(sign.x)} y={round(sign.y)} width={round(sign.width)} height={round(sign.height)} rx={round(6 * s)} style={{ fill: colour("ink") }} />
          <text x={art.labels.centreX} y={round(sign.y + sign.height * 0.68)} fontSize={sign.fontSize} fontWeight={700} textAnchor="middle" style={{ fill: colour("paper") }}>
            {SITE_NAME}
          </text>
        </g>
        {labels.flags.map((flag) => (
          <g key={flag.project.slug} data-project={flag.project.slug}>
            <Sheet d={flag.d} fill={flag.colour} shadow={[3 * s, 4 * s]} />
            <text x={flag.textX} y={flag.textY} fontSize={labels.fontSize} fontWeight={600} textAnchor="middle" style={{ fill: colour("paper") }}>
              {flag.project.title}
            </text>
          </g>
        ))}
      </g>
      <g data-layer="tide-lines">
        {CANYON_STRATA.map((stratum, index) => {
          const line = art.tideLines[index];

          return line === undefined
            ? null
            : (
                <g key={stratum.id} data-stratum={stratum.id} data-revealed={index < revealed}>
                  <Line line={line} />
                </g>
              );
        })}
      </g>
      <g data-layer="mist">
        <g data-ambient="mist">
          {drawNodes(art.mist)}
        </g>
      </g>
      <g data-layer="water">
        <g data-ambient="water">
          {drawNodes(art.waterBelow)}
        </g>
        <g clipPath={`url(#${clipId})`}>
          <g data-layer="rim-reflection">
            <path
              d={art.reflection.skyline + reflectedRim}
              style={{ fill: colour("blue-800") }}
              opacity={0.5}
              transform={`translate(0,${String(art.reflection.mirrorY)}) scale(1,-1)`}
            />
          </g>
        </g>
        {drawNodes(art.waterAbove)}
      </g>
      <g data-layer="drowned-edges">
        {CANYON_STRATA.map((stratum, index) => (
          <g key={stratum.id} data-stratum={stratum.id} data-revealed={index < revealed}>
            {drawNodes(art.drownedEdges[index] ?? [])}
          </g>
        ))}
      </g>
      <g data-layer="foreground">
        {drawNodes(art.foreground)}
      </g>
      <g data-layer="tablets">
        {CANYON_STRATA.map((stratum, index) => (
          <Tablet key={stratum.id} art={art} stratum={stratum} index={index} revealed={index < revealed} />
        ))}
      </g>
      <g data-layer="birds">
        <g data-ambient="birds">
          {drawNodes(art.birds)}
        </g>
      </g>
    </svg>
  );
}

/**
 * The Agentic tab's canyon, an inline paper-cut SVG drawn from the round-2
 * frames. It only reads `--p` (CSS, from an ancestor) and `data-revealed`;
 * every moving part is a `transform` or `opacity` in `canyon-scene.css`. The
 * desktop and phone compositions are both rendered and CSS shows the one that
 * fits. The drawing is decorative: the cards carry the same text.
 */
export function CanyonScene({ revealed, projects }: CanyonSceneProps): JSX.Element {
  return (
    <div className="canyon-scene" aria-hidden="true">
      <Composition art={CANYON_DESKTOP} name="desktop" revealed={revealed} projects={projects} />
      <Composition art={CANYON_PHONE} name="phone" revealed={revealed} projects={projects} />
    </div>
  );
}
