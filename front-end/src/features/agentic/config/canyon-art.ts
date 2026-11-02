/**
 * Types for the canyon scene's drawing data. The geometry itself lives in
 * `canyon-art-desktop.ts` and `canyon-art-phone.ts`, generated from the
 * round-2 paper-cut scene model (`docs/assets/agentic/round-2/README.md`).
 */

/** A Flexoki colour the scene paints with; `canyon-scene.css` defines `--canyon-<colour>` for each. */
export type CanyonColour
  = | "blue-100" | "blue-150" | "blue-200" | "blue-300" | "blue-400" | "blue-50" | "blue-500" | "blue-600"
    | "blue-700" | "blue-800" | "blue-850" | "blue-900" | "blue-950" | "green-600" | "green-700" | "green-800"
    | "green-950" | "ink" | "magenta-100" | "magenta-150" | "magenta-200" | "magenta-300" | "magenta-400"
    | "magenta-500" | "magenta-600" | "magenta-700" | "magenta-800" | "magenta-900" | "orange-100"
    | "orange-150" | "orange-200" | "orange-300" | "orange-400" | "orange-500" | "orange-600" | "orange-700"
    | "orange-800" | "orange-900" | "paper" | "purple-100" | "purple-150" | "purple-300" | "purple-400"
    | "purple-500" | "purple-600" | "purple-700" | "purple-800" | "purple-850" | "purple-900" | "purple-950"
    | "red-100" | "red-150" | "red-200" | "red-300" | "red-400" | "red-500" | "red-600" | "red-800" | "red-900"
    | "yellow-100" | "yellow-150" | "yellow-200" | "yellow-300" | "yellow-400" | "yellow-50" | "yellow-500"
    | "yellow-600" | "yellow-800";

/**
 * A time of day a pre-painted colour variant belongs to. The sky has a dusk
 * step the other layers skip, so its later steps get their own names.
 */
export type CanyonTone = "golden" | "sunset" | "night" | "sky-dusk" | "sky-night";

/** One cut-paper sheet, or the offset shadow of one (an `ink` sheet at partial opacity). */
export interface CanyonSheet {
  readonly d: string;
  readonly fill: CanyonColour;
  readonly opacity: number;
  readonly transform: string | null;
}

/** A stroked line: rope, river glint, tide line, lit edge, drowned edge. */
export interface CanyonLine {
  readonly d: string;
  readonly stroke: CanyonColour;
  readonly strokeWidth: number;
  readonly linecap: "round" | null;
  readonly linejoin: "round" | null;
  readonly dash: string | null;
  readonly opacity: number;
  readonly transform: string | null;
}

/** A group of sheets; `layer` names it in the `--p` map so CSS can move or fade it. */
export interface CanyonGroup {
  readonly children: readonly CanyonNode[];
  readonly layer: string | null;
  /** A colour variant that fades in over the ones below it and stays. */
  readonly tone: CanyonTone | null;
  /** A translucent colour variant shown only while its time of day lasts. */
  readonly only: CanyonTone | null;
  /** Which of the three staggered star twinkles the group plays. */
  readonly twinkle: number | null;
  readonly transform: string | null;
}

export type CanyonNode = CanyonSheet | CanyonLine | CanyonGroup;

/** Where a stratum's tablet hangs: beside the wall edge at the middle of its band. */
export interface CanyonTabletAnchor {
  readonly side: "left" | "right";
  /** The wall edge's x at `centreY`. */
  readonly edgeX: number;
  readonly centreY: number;
  /** The pin's colour: the stratum's deepest shade. */
  readonly pin: CanyonColour;
}

/** One composition (desktop or phone) of the scene, back to front. */
export interface CanyonComposition {
  readonly width: number;
  readonly height: number;
  /** Size of this composition against desktop; parallax distances scale with it. */
  readonly scale: number;
  /** Sky, sun and moon, depth planes, walls and cast shadows. */
  readonly back: readonly CanyonNode[];
  /** Per stratum (rim first), one hoodoo per pillar item. */
  readonly hoodoos: readonly (readonly (readonly CanyonNode[])[])[];
  /** Bridge and junipers; the sign, pole and flags are drawn from `labels`. */
  readonly rim: readonly CanyonNode[];
  readonly tints: readonly CanyonNode[];
  readonly labels: {
    readonly centreX: number;
    /** Top of the rim cap: the bridge posts and the flag pole stand on it. */
    readonly rimTop: number;
    readonly signFontSize: number;
    readonly poleX: number;
    readonly flagFontSize: number;
  };
  /** One dashed tide line per stratum. */
  readonly tideLines: readonly CanyonLine[];
  readonly mist: readonly CanyonNode[];
  /** Water at rest (`p = 0`): the strips, under the rim reflection. */
  readonly waterBelow: readonly CanyonNode[];
  /** Water at rest: the sun and moon columns and the foam, over the rim reflection. */
  readonly waterAbove: readonly CanyonNode[];
  readonly reflection: {
    /** The rim skyline that does not depend on the project list. */
    readonly skyline: string;
    /** The ripple bands that cut the mirror image. */
    readonly ripples: string;
    /** Mirror axis × 2: `translate(0, mirrorY) scale(1, -1)` flips the rim into the water. */
    readonly mirrorY: number;
  };
  /** Per stratum, the drowned edges that show through the water until it is revealed. */
  readonly drownedEdges: readonly (readonly CanyonNode[])[];
  readonly foreground: readonly CanyonNode[];
  readonly birds: readonly CanyonNode[];
  readonly tablets: readonly CanyonTabletAnchor[];
  readonly tablet: { readonly fontSize: number; readonly gap: number };
}
