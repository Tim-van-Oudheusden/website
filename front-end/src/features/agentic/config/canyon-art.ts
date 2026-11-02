/**
 * Types for the canyon scene's drawing data. The geometry lives in
 * `canyon-art-desktop.ts` and `canyon-art-phone.ts`, generated from the
 * round-2 paper-cut scene model and split into the round-3 layer stack
 * (`docs/assets/agentic/round-2/README.md`, `round-3/README.md`).
 */

/** A Flexoki colour the scene paints with; `canyon-scene.css` defines `--canyon-<colour>` for each. */
export type CanyonColour
  = | "blue-100" | "blue-150" | "blue-200" | "blue-300" | "blue-400" | "blue-50" | "blue-500" | "blue-600"
    | "blue-700" | "blue-800" | "blue-850" | "blue-900" | "blue-950" | "green-600" | "green-700"
    | "green-800" | "green-950" | "ink" | "magenta-100" | "magenta-150" | "magenta-200" | "magenta-300"
    | "magenta-400" | "magenta-500" | "magenta-600" | "magenta-700" | "magenta-800" | "magenta-900"
    | "orange-100" | "orange-150" | "orange-200" | "orange-300" | "orange-400" | "orange-500" | "orange-700"
    | "orange-800" | "orange-900" | "paper" | "purple-100" | "purple-150" | "purple-300" | "purple-400"
    | "purple-500" | "purple-600" | "purple-700" | "purple-800" | "purple-850" | "purple-900" | "purple-950"
    | "red-100" | "red-150" | "red-200" | "red-300" | "red-400" | "red-500" | "red-600" | "red-800"
    | "red-900" | "yellow-100" | "yellow-150" | "yellow-200" | "yellow-300" | "yellow-400" | "yellow-50"
    | "yellow-500" | "yellow-600" | "yellow-800";

/** The offset paper shadow under a sheet: the same shape in `ink`, shifted. */
export interface CanyonShadow {
  readonly dx: number;
  readonly dy: number;
  readonly opacity: number;
}

/** One cut-paper sheet, with its shadow when it casts one. */
export interface CanyonSheet {
  readonly d: string;
  readonly fill: CanyonColour;
  readonly opacity: number;
  readonly shadow: CanyonShadow | null;
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
}

export type CanyonNode = CanyonSheet | CanyonLine;

/** The art-unit rectangle a layer's box covers: only the rows (and columns) its drawing uses. */
export type CanyonBox = readonly [x: number, y: number, width: number, height: number];

/** A layer drawn entirely from data. `id` names it in `canyon-scene.css`, which moves and fades it. */
export interface CanyonArtLayer {
  readonly kind: "art";
  readonly id: string;
  /** The stratum whose reveal shows (tide line) or hides (drowned edges) this layer. */
  readonly stratum: number | null;
  readonly box: CanyonBox;
  readonly nodes: readonly CanyonNode[];
}

/** The static stage: hoodoos (per stratum, one per pillar item) and the rim's bridge and junipers. */
export interface CanyonStageLayer {
  readonly kind: "stage";
  readonly id: string;
  readonly box: CanyonBox;
  readonly hoodoos: readonly (readonly (readonly CanyonNode[])[])[];
  readonly rim: readonly CanyonNode[];
}

/** The rim mirrored in the calm golden water, cut into ripple bands. */
export interface CanyonReflectionLayer {
  readonly kind: "reflection";
  readonly id: string;
  /** The ripple bands that cut the mirror image. */
  readonly ripples: string;
  /** The rim skyline that does not depend on the project list. */
  readonly skyline: string;
  /** Mirror axis × 2: `translate(0, mirrorY) scale(1, -1)` flips the rim into the water. */
  readonly mirrorY: number;
  readonly box: CanyonBox;
}

/** The site sign and the project flags, laid out from the project list. */
export interface CanyonRimLabelsLayer {
  readonly kind: "rim-labels";
  readonly id: string;
}

/** One stratum's tablet, laid out from its heading. */
export interface CanyonTabletLayer {
  readonly kind: "tablet";
  readonly id: string;
  readonly stratum: number;
}

export type CanyonLayer
  = | CanyonArtLayer
    | CanyonStageLayer
    | CanyonReflectionLayer
    | CanyonRimLabelsLayer
    | CanyonTabletLayer;

/** Where a stratum's tablet hangs: beside the wall edge at the middle of its band. */
export interface CanyonTabletAnchor {
  readonly side: "left" | "right";
  /** The wall edge's x at `centreY`. */
  readonly edgeX: number;
  readonly centreY: number;
  /** The pin's colour: the stratum's deepest shade. */
  readonly pin: CanyonColour;
}

/** One composition (desktop or phone) of the scene: its layers back to front. */
export interface CanyonComposition {
  readonly width: number;
  readonly height: number;
  /** Size of this composition against desktop; parallax distances scale with it. */
  readonly scale: number;
  readonly layers: readonly CanyonLayer[];
  readonly labels: {
    readonly centreX: number;
    /** Top of the rim cap: the bridge posts and the flag pole stand on it. */
    readonly rimTop: number;
    readonly signFontSize: number;
    readonly poleX: number;
    readonly flagFontSize: number;
  };
  readonly tablets: readonly CanyonTabletAnchor[];
  readonly tablet: { readonly fontSize: number; readonly gap: number };
}
