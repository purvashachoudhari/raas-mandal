import type { SequenceItem, StepId } from "../state/types";

export const BEATS_PER_BAR = 4;
export const MIN_BARS = 1;
export const MAX_BARS = 16;

/** A step's timing and motion. Its names live in data/strings.ts. */
export interface StepDef {
  id: StepId;
  /** Library group: a dance step, or a whole-circle formation move. */
  group: "step" | "formation";
  unitBeats: 2 | 4 | 8; // length of one movement cycle
  travel: number; // how fast the circle moves round during this step
  defaultBars: number; // length when added from the library
  pairs?: boolean; // dancers work with their even/odd neighbour
  prop?: "dandiya" | "tippani";
}

export const STEPS: Readonly<Record<StepId, StepDef>> = {
  beTaali: { id: "beTaali", group: "step", unitBeats: 4, travel: 1.0, defaultBars: 2 },
  tranTaali: { id: "tranTaali", group: "step", unitBeats: 4, travel: 1.1, defaultBars: 2 },
  dodhiyu: { id: "dodhiyu", group: "step", unitBeats: 4, travel: 1.8, defaultBars: 2 },
  hinch: { id: "hinch", group: "step", unitBeats: 2, travel: 0.7, defaultBars: 2 },
  fudardi: { id: "fudardi", group: "step", unitBeats: 2, travel: 1.2, defaultBars: 1 },
  dandiya: { id: "dandiya", group: "step", unitBeats: 4, travel: 0.6, defaultBars: 2, pairs: true, prop: "dandiya" },
  popatiyu: { id: "popatiyu", group: "step", unitBeats: 4, travel: 0.5, defaultBars: 2 },
  sanedo: { id: "sanedo", group: "step", unitBeats: 4, travel: 1.0, defaultBars: 2 },
  hudo: { id: "hudo", group: "step", unitBeats: 4, travel: 0.5, defaultBars: 2, pairs: true },
  tippani: { id: "tippani", group: "step", unitBeats: 4, travel: 0.6, defaultBars: 2, prop: "tippani" },
  walk: { id: "walk", group: "step", unitBeats: 4, travel: 0.8, defaultBars: 1 },
  handFlow: { id: "handFlow", group: "step", unitBeats: 4, travel: 0, defaultBars: 1 },
  centreInOut: { id: "centreInOut", group: "formation", unitBeats: 8, travel: 0.2, defaultBars: 2 },
  partnerSwap: { id: "partnerSwap", group: "formation", unitBeats: 4, travel: 0.8, defaultBars: 1, pairs: true },
};

export const STEP_IDS = Object.keys(STEPS) as StepId[];

/** Bars added or removed per click in the sequence editor: whole repeats of the move. */
export const barStep = (id: StepId) => Math.max(1, STEPS[id].unitBeats / BEATS_PER_BAR);

/** Step ids from before M8, mapped to their current names. */
export const LEGACY_STEP_IDS: Readonly<Record<string, StepId>> = { be: "beTaali", tran: "tranTaali" };

export const DEFAULT_SEQUENCE: readonly SequenceItem[] = [
  { step: "beTaali", bars: 2 },
  { step: "tranTaali", bars: 2 },
  { step: "hinch", bars: 2 },
  { step: "dodhiyu", bars: 4 },
  { step: "fudardi", bars: 1 },
  { step: "dandiya", bars: 2 },
];
