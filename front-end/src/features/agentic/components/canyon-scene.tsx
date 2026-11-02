import type { CSSProperties, JSX, ReactNode } from "react";
import { createElement, Fragment, memo, useId, useMemo, useSyncExternalStore } from "react";

import { SITE_NAME } from "shared";

import type {
  CanyonBox,
  CanyonColour,
  CanyonComposition,
  CanyonLayer,
  CanyonNode,
  CanyonReflectionLayer,
  CanyonStageLayer,
} from "../config/canyon-art";
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

type CompositionName = "desktop" | "phone";

/** Flag colours in turn; paper text on each is at least 6:1. */
const FLAG_COLOURS: readonly CanyonColour[] = ["blue-600", "green-700", "purple-600"];

/** Each tablet hangs at its own slight angle, like a hand-pinned tag. */
const TABLET_TILT: readonly number[] = [-1.6, 1.2, -0.8, 1.5, -1.2, 0.9];

/** Room, in art units, around drawn labels so their shadows and tilt stay inside their layer box. */
const LABEL_MARGIN = 14;

/** Tailwind's `sm` breakpoint: the desktop composition from here up, the phone one below. */
const DESKTOP_QUERY = "(min-width: 40rem)";

type Point = readonly [number, number];

/** The layer box's art-unit rectangle, read by `canyon-scene.css` to place and size it. */
type BoxStyle = CSSProperties & Record<`--${string}`, number>;

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

/** The whole-unit box around `[x0, y0]–[x1, y1]`, with `LABEL_MARGIN` to spare. */
function boxAround(x0: number, y0: number, x1: number, y1: number): CanyonBox {
  const left = Math.floor(x0 - LABEL_MARGIN);
  const top = Math.floor(y0 - LABEL_MARGIN);

  return [left, top, Math.ceil(x1 + LABEL_MARGIN) - left, Math.ceil(y1 + LABEL_MARGIN) - top];
}

function subscribeToViewport(onChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);

  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
}

function viewportComposition(): CompositionName {
  return window.matchMedia(DESKTOP_QUERY).matches ? "desktop" : "phone";
}

/** Without a viewport (static render) both compositions go out and CSS shows the one that fits. */
function noViewport(): null {
  return null;
}

/** One node of the drawing. Its children are static, so they go in as arguments and need no keys. */
function drawNode(node: CanyonNode): JSX.Element {
  if ("stroke" in node) {
    return (
      <path
        d={node.d}
        style={{ fill: "none", stroke: colour(node.stroke) }}
        strokeWidth={node.strokeWidth}
        strokeLinecap={node.linecap ?? undefined}
        strokeLinejoin={node.linejoin ?? undefined}
        strokeDasharray={node.dash ?? undefined}
        opacity={node.opacity}
      />
    );
  }

  const sheet = <path d={node.d} style={{ fill: colour(node.fill) }} opacity={node.opacity} />;

  if (node.shadow === null) {
    return sheet;
  }

  return (
    <>
      <path
        d={node.d}
        style={{ fill: colour("ink") }}
        opacity={node.shadow.opacity}
        transform={translate(node.shadow.dx, node.shadow.dy)}
      />
      {sheet}
    </>
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

/**
 * One layer: an HTML box the size of the art it holds, with its own `<svg>`
 * cropped to the same rectangle. CSS moves and fades the box, so the browser
 * composites it without repainting the drawing.
 */
function LayerBox({ id, box, revealed, children }: {
  id: string;
  box: CanyonBox;
  revealed: boolean | null;
  children: ReactNode;
}): JSX.Element {
  const [x, y, width, height] = box;
  const style: BoxStyle = { "--x": x, "--y": y, "--w": width, "--h": height };
  // The water drifts sideways, so its drawing reaches 8 units past each side of the box.
  const drift = id.startsWith("water-") ? 8 : 0;

  return (
    <div className="canyon-layer" data-layer={id} data-revealed={revealed ?? undefined} style={style}>
      <svg
        viewBox={`${String(x - drift)} ${String(y)} ${String(width + 2 * drift)} ${String(height)}`}
        preserveAspectRatio="none"
        focusable="false"
      >
        {children}
      </svg>
    </div>
  );
}

interface RimLabels {
  sign: { x: number; y: number; width: number; height: number; fontSize: number };
  stilts: string;
  pole: { d: string; x: number; top: number } | null;
  flags: { project: CanyonSceneProject; d: string; textX: number; textY: number; colour: CanyonColour }[];
  fontSize: number;
  /** The box around the sign and the flags. */
  box: CanyonBox;
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
  let left = signX;
  const flags = projects.map((project, index) => {
    const y = poleTop + 8 * s + index * step;
    const x1 = poleX - 3 * s;
    const x0 = x1 - (textWidth(project.title, flagFontSize, false) + 30 * s);
    const wave = 3 * s * (index % 2 === 1 ? 1 : -1);

    left = Math.min(left, x0);

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
  const right = projects.length === 0 ? signX + signWidth : Math.max(signX + signWidth, poleX);
  const top = Math.min(signY, poleTop);

  return {
    sign: { x: signX, y: signY, width: signWidth, height: signHeight, fontSize: signFontSize },
    stilts,
    pole,
    flags,
    fontSize: flagFontSize,
    box: boxAround(left, top, right, Math.max(signY + signHeight, poleTop + 8 * s + projects.length * step)),
  };
}

function Stage({ layer, labels, scale }: { layer: CanyonStageLayer; labels: RimLabels; scale: number }): JSX.Element {
  const [x, y, width, height] = layer.box;
  const top = labels.pole === null ? y : Math.min(y, Math.floor(labels.pole.top - 6 * scale - LABEL_MARGIN));

  return (
    <LayerBox id={layer.id} box={[x, top, width, height + y - top]} revealed={null}>
      {CANYON_STRATA.map((stratum, stratumIndex) => {
        const slots = layer.hoodoos[stratumIndex] ?? [];

        // One hoodoo per pillar item: the drawing has a slot for each, in config order.
        return slots.map((slot, slotIndex) => {
          const pillar = stratum.pillars[slotIndex] ?? "";

          return <g key={`${stratum.id}:${pillar}`} data-pillar={pillar}>{drawNodes(slot)}</g>;
        });
      })}
      {drawNodes(layer.rim)}
      <path d={labels.stilts} style={{ fill: colour("orange-900") }} />
      {labels.pole === null
        ? null
        : (
            <>
              <Sheet d={labels.pole.d} fill="orange-900" shadow={[2 * scale, 3 * scale]} />
              <circle
                cx={labels.pole.x}
                cy={round(labels.pole.top - 2 * scale)}
                r={round(4 * scale)}
                style={{ fill: colour("ink") }}
                opacity={0.3}
                transform={translate(1, 2)}
              />
              <circle
                cx={labels.pole.x}
                cy={round(labels.pole.top - 2 * scale)}
                r={round(4 * scale)}
                style={{ fill: colour("yellow-300") }}
              />
            </>
          )}
    </LayerBox>
  );
}

function RimLabelsLayer({ id, labels, centreX, scale }: {
  id: string;
  labels: RimLabels;
  centreX: number;
  scale: number;
}): JSX.Element {
  const { sign } = labels;
  const plate = {
    x: round(sign.x),
    y: round(sign.y),
    width: round(sign.width),
    height: round(sign.height),
    rx: round(6 * scale),
  };

  return (
    <LayerBox id={id} box={labels.box} revealed={null}>
      <g data-site-name="true">
        <rect {...plate} style={{ fill: colour("ink") }} opacity={0.35} transform={translate(3 * scale, 4 * scale)} />
        <rect {...plate} style={{ fill: colour("ink") }} />
        <text x={centreX} y={round(sign.y + sign.height * 0.68)} fontSize={sign.fontSize} fontWeight={700} textAnchor="middle" style={{ fill: colour("paper") }}>
          {SITE_NAME}
        </text>
      </g>
      {labels.flags.map((flag) => (
        <g key={flag.project.slug} data-project={flag.project.slug}>
          <Sheet d={flag.d} fill={flag.colour} shadow={[3 * scale, 4 * scale]} />
          <text x={flag.textX} y={flag.textY} fontSize={labels.fontSize} fontWeight={600} textAnchor="middle" style={{ fill: colour("paper") }}>
            {flag.project.title}
          </text>
        </g>
      ))}
    </LayerBox>
  );
}

function Reflection({ layer, labels }: { layer: CanyonReflectionLayer; labels: RimLabels }): JSX.Element {
  const clipId = `${useId()}-ripples`;
  const { sign } = labels;
  // The sign, pole and flags depend on the project list, so they join the static skyline here.
  const reflectedLabels = [
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
    <LayerBox id={layer.id} box={layer.box} revealed={null}>
      <defs>
        <clipPath id={clipId}>
          <path d={layer.ripples} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <path
          d={layer.skyline + reflectedLabels}
          style={{ fill: colour("blue-800") }}
          opacity={0.5}
          transform={`translate(0,${String(layer.mirrorY)}) scale(1,-1)`}
        />
      </g>
    </LayerBox>
  );
}

function Tablet({ art, id, stratum, index, revealed }: {
  art: CanyonComposition;
  id: string;
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
  const tag = { x: round(x), y: round(y), width: round(width), height: round(height), rx: 3 };
  const tilt = `rotate(${String(TABLET_TILT[index] ?? 0)} ${String(round(x + width / 2))} ${String(anchor.centreY)})`;

  return (
    <LayerBox id={id} box={boxAround(x, y, x + width + 4 * s, y + height + 6 * s)} revealed={revealed}>
      <g data-tablet={stratum.id} data-revealed={revealed}>
        <g transform={tilt}>
          <rect {...tag} style={{ fill: colour("ink") }} opacity={0.35} transform={translate(4 * s, 6 * s)} />
          <rect {...tag} style={{ fill: colour("paper") }} />
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
    </LayerBox>
  );
}

/** One layer of a composition. */
function CompositionLayer({ layer, art, labels, shown }: {
  layer: CanyonLayer;
  art: CanyonComposition;
  labels: RimLabels;
  /** Whether this layer's stratum is revealed; `null` for layers that belong to no stratum. */
  shown: boolean | null;
}): JSX.Element | null {
  switch (layer.kind) {
    case "art":
      return (
        <LayerBox id={layer.id} box={layer.box} revealed={shown}>
          {drawNodes(layer.nodes)}
        </LayerBox>
      );
    case "stage":
      return <Stage layer={layer} labels={labels} scale={art.scale} />;
    case "rim-labels":
      return <RimLabelsLayer id={layer.id} labels={labels} centreX={art.labels.centreX} scale={art.scale} />;
    case "reflection":
      return <Reflection layer={layer} labels={labels} />;
    case "tablet": {
      const stratum = CANYON_STRATA[layer.stratum];

      return stratum === undefined
        ? null
        : <Tablet art={art} id={layer.id} stratum={stratum} index={layer.stratum} revealed={shown === true} />;
    }
  }
}

/** Memoised: a reveal changes `shown` on its stratum's three layers only, so the rest of the drawing stays put. */
const Layer = memo(CompositionLayer);

/** Whether `layer` belongs to a stratum, and if so whether that stratum is among the first `revealed`. */
function layerShown(layer: CanyonLayer, revealed: number): boolean | null {
  if (layer.kind === "tablet") {
    return layer.stratum < revealed;
  }

  return layer.kind === "art" && layer.stratum !== null ? layer.stratum < revealed : null;
}

function Composition({ art, name, revealed, projects }: CanyonSceneProps & {
  art: CanyonComposition;
  name: CompositionName;
}): JSX.Element {
  const labels = useMemo(() => rimLabels(art, projects), [art, projects]);

  return (
    <div data-composition={name} className={name === "phone" ? "canyon-composition sm:hidden" : "canyon-composition hidden sm:block"}>
      {art.layers.filter((layer) => layer.kind !== "tablet").map((layer) => (
        <Layer key={layer.id} layer={layer} art={art} labels={labels} shown={layerShown(layer, revealed)} />
      ))}
      {/* The end of the scene: the land fades into the page as the track ends; the tablets stay on top of it. */}
      <div className="canyon-night-fade" data-night-fade="" />
      {art.layers.filter((layer) => layer.kind === "tablet").map((layer) => (
        <Layer key={layer.id} layer={layer} art={art} labels={labels} shown={layerShown(layer, revealed)} />
      ))}
    </div>
  );
}

/**
 * The Agentic tab's canyon, a paper-cut scene drawn from the round-2 frames as
 * the round-3 layer stack: one cropped `<svg>` box per layer, which
 * `canyon-scene.css` moves and fades from `--p` (transform and opacity only),
 * so scrolling never lays out or repaints the drawing. In the browser only the
 * composition that fits the viewport is built. The drawing is decorative: the
 * cards carry the same text.
 */
export function CanyonScene({ revealed, projects }: CanyonSceneProps): JSX.Element {
  const composition = useSyncExternalStore<CompositionName | null>(
    subscribeToViewport,
    viewportComposition,
    noViewport,
  );

  return (
    <div className="canyon-scene" aria-hidden="true">
      {composition === "phone"
        ? null
        : <Composition art={CANYON_DESKTOP} name="desktop" revealed={revealed} projects={projects} />}
      {composition === "desktop"
        ? null
        : <Composition art={CANYON_PHONE} name="phone" revealed={revealed} projects={projects} />}
    </div>
  );
}
