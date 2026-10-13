import { BEATS_PER_BAR } from "../data/steps";
import type { SequenceItem, StepId } from "./types";

export interface SequencePos {
  index: number;
  step: StepId;
  beatInStep: number;
  lengthBeats: number;
  /** The step before this one, for blending; null when the sequence has a single item. */
  prev: { step: StepId; lengthBeats: number } | null;
}

export const sequenceBeats = (seq: readonly SequenceItem[]) =>
  seq.reduce((total, item) => total + item.bars * BEATS_PER_BAR, 0);

/** Where a beat position falls in the looping sequence. */
export function sequenceAt(seq: readonly SequenceItem[], beat: number): SequencePos | null {
  const total = sequenceBeats(seq);
  if (!total) return null;
  let p = ((beat % total) + total) % total;
  for (let i = 0; i < seq.length; i++) {
    const len = seq[i].bars * BEATS_PER_BAR;
    if (p < len) {
      const prevItem = seq[(i - 1 + seq.length) % seq.length];
      return {
        index: i,
        step: seq[i].step,
        beatInStep: p,
        lengthBeats: len,
        prev: seq.length > 1 ? { step: prevItem.step, lengthBeats: prevItem.bars * BEATS_PER_BAR } : null,
      };
    }
    p -= len;
  }
  return null;
}
