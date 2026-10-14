import type { SequenceItem, StepId } from "../state/types";

export const BEATS_PER_BAR = 4;
export const MIN_BARS = 1;
export const MAX_BARS = 16;

export interface StepDef {
  id: StepId;
  /** Library group: a dance step, or a whole-circle formation move. */
  group: "step" | "formation";
  gu: string;
  en: string;
  feel: string;
  unitBeats: 2 | 4 | 8; // length of one movement cycle
  travel: number; // how fast the circle moves round during this step
  defaultBars: number; // length when added from the library
  pairs?: boolean; // dancers work with their even/odd neighbour
  prop?: "dandiya" | "tippani";
}

export const STEPS: Readonly<Record<StepId, StepDef>> = {
  beTaali: { id: "beTaali", group: "step", gu: "બે તાળી", en: "Be Taali", feel: "two claps", unitBeats: 4, travel: 1.0, defaultBars: 2 },
  tranTaali: { id: "tranTaali", group: "step", gu: "ત્રણ તાળી", en: "Tran Taali", feel: "three claps", unitBeats: 4, travel: 1.1, defaultBars: 2 },
  dodhiyu: { id: "dodhiyu", group: "step", gu: "દોઢિયું", en: "Dodhiyu", feel: "fast hop", unitBeats: 4, travel: 1.8, defaultBars: 2 },
  hinch: { id: "hinch", group: "step", gu: "હીંચ", en: "Hinch", feel: "6/8 sway", unitBeats: 2, travel: 0.7, defaultBars: 2 },
  fudardi: { id: "fudardi", group: "step", gu: "ફુદરડી", en: "Fudardi", feel: "spin", unitBeats: 2, travel: 1.2, defaultBars: 1 },
  dandiya: { id: "dandiya", group: "step", gu: "દાંડિયા", en: "Dandiya", feel: "pairs", unitBeats: 4, travel: 0.6, defaultBars: 2, pairs: true, prop: "dandiya" },
  popatiyu: { id: "popatiyu", group: "step", gu: "પોપટિયું", en: "Popatiyu", feel: "parrot dip", unitBeats: 4, travel: 0.5, defaultBars: 2 },
  sanedo: { id: "sanedo", group: "step", gu: "સનેડો", en: "Sanedo", feel: "Kutchi bounce", unitBeats: 4, travel: 1.0, defaultBars: 2 },
  hudo: { id: "hudo", group: "step", gu: "હુડો", en: "Hudo", feel: "partner claps", unitBeats: 4, travel: 0.5, defaultBars: 2, pairs: true },
  tippani: { id: "tippani", group: "step", gu: "ટિપ્પણી", en: "Tippani", feel: "stick strikes", unitBeats: 4, travel: 0.6, defaultBars: 2, prop: "tippani" },
  centreInOut: { id: "centreInOut", group: "formation", gu: "અંદર-બહાર", en: "Into the centre & out", feel: "all circles", unitBeats: 8, travel: 0.2, defaultBars: 2 },
  partnerSwap: { id: "partnerSwap", group: "formation", gu: "જોડી બદલો", en: "Partner swap", feel: "trade places", unitBeats: 4, travel: 0.8, defaultBars: 1, pairs: true },
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
