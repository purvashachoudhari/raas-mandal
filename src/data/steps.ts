import type { SequenceItem, StepId } from "../state/types";

export const BEATS_PER_BAR = 4;
export const MIN_BARS = 1;
export const MAX_BARS = 16;

export interface StepDef {
  id: StepId;
  gu: string;
  en: string;
  feel: string;
  unitBeats: 2 | 4; // length of one movement cycle
  travel: number; // how fast the circle moves round during this step
  defaultBars: number; // length when added from the library
}

export const STEPS: Readonly<Record<StepId, StepDef>> = {
  be: { id: "be", gu: "બે તાળી", en: "Be Taali", feel: "two claps", unitBeats: 4, travel: 1.0, defaultBars: 2 },
  tran: { id: "tran", gu: "ત્રણ તાળી", en: "Tran Taali", feel: "three claps", unitBeats: 4, travel: 1.1, defaultBars: 2 },
  dodhiyu: { id: "dodhiyu", gu: "દોઢિયું", en: "Dodhiyu", feel: "fast hop", unitBeats: 4, travel: 1.8, defaultBars: 2 },
  hinch: { id: "hinch", gu: "હીંચ", en: "Hinch", feel: "6/8 sway", unitBeats: 2, travel: 0.7, defaultBars: 2 },
  fudardi: { id: "fudardi", gu: "ફુદરડી", en: "Fudardi", feel: "spin", unitBeats: 2, travel: 1.2, defaultBars: 1 },
  dandiya: { id: "dandiya", gu: "દાંડિયા", en: "Dandiya", feel: "pairs", unitBeats: 4, travel: 0.6, defaultBars: 2 },
};

export const STEP_IDS = Object.keys(STEPS) as StepId[];

export const DEFAULT_SEQUENCE: readonly SequenceItem[] = [
  { step: "be", bars: 2 },
  { step: "tran", bars: 2 },
  { step: "hinch", bars: 2 },
  { step: "dodhiyu", bars: 4 },
  { step: "fudardi", bars: 1 },
  { step: "dandiya", bars: 2 },
];
