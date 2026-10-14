import type { BeatGrid } from "../analysis/corrections";
import { BEATS_PER_BAR, MAX_BARS } from "../data/steps";
import type { BeatMap, SequenceItem, StepId } from "./types";

// Auto choreography (§5.9): pick steps from the song's energy curve. Each energy level has three
// steps that take turns; a section change opens with Fudardi or Into the centre & out (alternating);
// every 8 bars at one level end with a Partner swap.

/** Songs move in 4-bar phrases; the energy level is decided per phrase. */
const PHRASE_BARS = 4;

type Level = 0 | 1 | 2; // calm, medium, high

const STEPS_FOR: Record<Level, readonly [StepId, StepId, StepId]> = {
  0: ["hinch", "beTaali", "popatiyu"],
  1: ["tranTaali", "hudo", "tippani"],
  2: ["dodhiyu", "sanedo", "dandiya"],
};
const SECTION_OPENERS: readonly SequenceItem[] = [{ step: "fudardi", bars: 1 }, { step: "centreInOut", bars: 2 }];

function nearestIndex(times: number[], t: number): number {
  let lo = 0, hi = times.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return lo > 0 && Math.abs(times[lo - 1] - t) < Math.abs(times[lo] - t) ? lo - 1 : lo;
}

/** Mean energy of each bar the dancers dance, counted from the first downbeat. */
export function barEnergies(map: BeatMap, grid: BeatGrid): number[] {
  if (!map.energy.length) return [];
  const out: number[] = [];
  for (let i = grid.firstDownbeat; i + BEATS_PER_BAR <= grid.beats.length; i += BEATS_PER_BAR) {
    let sum = 0;
    for (let k = 0; k < BEATS_PER_BAR; k++) sum += map.energy[nearestIndex(map.beats, grid.beats[i + k])] ?? 0;
    out.push(sum / BEATS_PER_BAR);
  }
  return out;
}

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];

/** One SequenceItem list that covers the whole song (then loops, like a manual sequence). */
export function autoSequence(bars: number[]): SequenceItem[] {
  if (!bars.length) return [];

  // 1. Phrases and their mean energy.
  const phrases: { bars: number; energy: number }[] = [];
  for (let i = 0; i < bars.length; i += PHRASE_BARS) {
    const slice = bars.slice(i, i + PHRASE_BARS);
    phrases.push({ bars: slice.length, energy: slice.reduce((a, b) => a + b, 0) / slice.length });
  }

  // 2. Level per phrase, relative to the song itself. A song with almost no energy change
  //    stays at one level (by how loud it is overall) instead of flipping on tiny differences.
  const sorted = phrases.map((p) => p.energy).sort((a, b) => a - b);
  const range = sorted[sorted.length - 1] - sorted[0];
  const levelOf = (e: number): Level => {
    if (range < 0.12) return e > 0.8 ? 2 : e < 0.5 ? 0 : 1;
    if (e <= quantile(sorted, 0.35)) return 0;
    if (e >= quantile(sorted, 0.7)) return 2;
    return 1;
  };
  const levels = phrases.map((p) => levelOf(p.energy));

  // 3. Remove one-phrase blips so sections hold together.
  for (let i = 1; i + 1 < levels.length; i++) {
    if (levels[i - 1] === levels[i + 1] && levels[i] !== levels[i - 1]) levels[i] = levels[i - 1];
  }

  // 4. Steps: two per phrase, rotating through the level's three steps. A new section opens with
  //    Fudardi or Into the centre & out (taking turns); every second phrase in a section (8 bars at
  //    one level) ends with a Partner swap.
  const items: SequenceItem[] = [];
  let inSection = 0, openers = 0, rotation = 0;
  phrases.forEach((p, i) => {
    const level = levels[i];
    const change = i > 0 && level !== levels[i - 1];
    inSection = change ? 0 : inSection + (i > 0 ? 1 : 0);
    let remaining = p.bars;
    if (change) {
      const opener = SECTION_OPENERS[openers++ % SECTION_OPENERS.length];
      if (remaining > opener.bars) {
        items.push({ ...opener });
        remaining -= opener.bars;
      }
    }
    const swap = inSection % 2 === 1 && remaining > 1;
    if (swap) remaining--;
    const steps = STEPS_FOR[level];
    const a = steps[rotation % 3], b = steps[(rotation + 1) % 3];
    rotation++;
    const first = Math.ceil(remaining / 2);
    items.push({ step: a, bars: first });
    if (remaining - first > 0) items.push({ step: b, bars: remaining - first });
    if (swap) items.push({ step: "partnerSwap", bars: 1 });
  });

  // 5. Merge neighbours that ended up the same step.
  const merged: SequenceItem[] = [];
  for (const it of items) {
    const last = merged[merged.length - 1];
    if (last && last.step === it.step && last.bars + it.bars <= MAX_BARS) last.bars += it.bars;
    else merged.push({ ...it });
  }
  return merged;
}
