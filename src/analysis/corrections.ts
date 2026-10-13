import type { BeatMap } from "../state/types";

/** Optional manual fixes on top of the detected beats, saved per song. */
export interface Corrections {
  /** Shift every beat later (+) or earlier (−), in ms. */
  offsetMs: number;
  /** 0.5 = half tempo (every other beat), 2 = double tempo (beats plus midpoints). */
  factor: 0.5 | 1 | 2;
}

export const NO_CORRECTIONS: Corrections = { offsetMs: 0, factor: 1 };
export const NUDGE_MS = 10;
export const TAPS_NEEDED = 8;

/** The beats the dancers follow. */
export interface BeatGrid {
  beats: number[];
  /** Index into `beats` of the first downbeat: the sequence starts there. */
  firstDownbeat: number;
  bpm: number;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

export function applyCorrections(map: BeatMap, c: Corrections): BeatGrid {
  let beats = map.beats.slice();
  let first = Math.max(0, beats.indexOf(map.downbeats[0]));

  if (c.factor === 0.5) {
    // Keep every other beat, staying in step with the first downbeat.
    beats = beats.filter((_, i) => (((i - first) % 2) + 2) % 2 === 0);
    first = Math.floor(first / 2);
  } else if (c.factor === 2) {
    beats = beats.flatMap((t, i) => (i + 1 < beats.length ? [t, (t + beats[i + 1]) / 2] : [t]));
    first *= 2;
  }
  if (c.offsetMs) beats = beats.map((t) => t + c.offsetMs / 1000);

  const intervals = beats.slice(1).map((t, i) => t - beats[i]);
  return { beats, firstDownbeat: Math.min(first, Math.max(0, beats.length - 1)), bpm: intervals.length ? 60 / median(intervals) : map.bpm };
}

/**
 * Tap to correct: from 8 taps on the beat, fix the tempo level if the taps are clearly at half or
 * double the detected tempo, then shift the beats so they sit on the taps (phase re-fit).
 */
export function fitTaps(map: BeatMap, current: Corrections, taps: number[]): Corrections {
  let factor = current.factor;
  const tapInterval = median(taps.slice(1).map((t, i) => t - taps[i]));
  const grid = applyCorrections(map, current);
  const beatInterval = 60 / grid.bpm;
  const ratio = tapInterval / beatInterval;
  if (ratio > 1.6 && factor > 0.5) factor = factor === 2 ? 1 : 0.5;
  else if (ratio < 0.65 && factor < 2) factor = factor === 0.5 ? 1 : 2;

  const refit = applyCorrections(map, { offsetMs: current.offsetMs, factor });
  const errors = taps.map((tap) => {
    let nearest = Infinity;
    for (const b of refit.beats) if (Math.abs(tap - b) < Math.abs(nearest)) nearest = tap - b;
    return nearest;
  });
  const shift = median(errors);
  return { factor, offsetMs: Math.round(current.offsetMs + shift * 1000) };
}
