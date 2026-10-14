import type { BeatGrid } from "../analysis/corrections";
import { BEATS_PER_BAR } from "../data/steps";

// Tap-to-sync for YouTube songs (§5.8): their audio can't be analysed, so the user taps along and
// the beat is a straight line through the taps. Saved per video in localStorage.

export interface TapSync {
  /** Tempo, after any ½× / 2×. */
  bpm: number;
  /** Song time (s) of the first fitted tap: a beat, taken as the start of a bar. */
  offset: number;
  /** Manual nudge on top of the fit (ms): + later, − earlier. */
  nudgeMs: number;
}

export const MIN_TAPS = 4;
const MAX_TAPS = 16;
/** Taps further apart than this start a new set. */
export const TAP_RESET_S = 2.5;
const KEY = "raasMandal.youtubeSync.v1";

function readAll(): Record<string, TapSync> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return all && typeof all === "object" ? all : {};
  } catch {
    return {};
  }
}

export function loadSync(videoId: string): TapSync | null {
  const s = readAll()[videoId];
  return s && Number.isFinite(s.bpm) && Number.isFinite(s.offset) ? { bpm: s.bpm, offset: s.offset, nudgeMs: Number(s.nudgeMs) || 0 } : null;
}

export function saveSync(videoId: string, sync: TapSync | null) {
  try {
    const all = readAll();
    if (sync) all[videoId] = sync;
    else delete all[videoId];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage unavailable: the sync lasts until reload.
  }
}

/**
 * Least-squares line through the tap times (tap time = offset + index × period). Taps are numbered
 * by the nearest whole beat from the first, so a missed beat doesn't skew the tempo.
 * Returns null until there are enough plausible taps.
 */
export function fitTapLine(taps: readonly number[]): { bpm: number; offset: number } | null {
  const t = taps.slice(-MAX_TAPS);
  if (t.length < MIN_TAPS) return null;
  const gaps = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
  const rough = gaps[Math.floor(gaps.length / 2)];
  if (!(rough > 0.25 && rough < 1.5)) return null;
  const idx = t.map((x) => Math.round((x - t[0]) / rough));
  const n = t.length;
  const mi = idx.reduce((a, b) => a + b, 0) / n, mt = t.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0;
  for (let k = 0; k < n; k++) { sxy += (idx[k] - mi) * (t[k] - mt); sxx += (idx[k] - mi) ** 2; }
  if (!sxx) return null;
  const period = sxy / sxx;
  if (!(period > 0.25 && period < 1.5)) return null;
  return { bpm: 60 / period, offset: mt - period * mi };
}

/**
 * An even beat grid from a tap sync, so the beat clock, step changes and Play mode work exactly as
 * for analysed songs. The sequence starts on the earliest bar line (in step with the first tap)
 * at or after the start of the song.
 */
export function syncGrid(sync: TapSync, duration: number): BeatGrid {
  const period = 60 / sync.bpm;
  const off = sync.offset + sync.nudgeMs / 1000;
  const bar = period * BEATS_PER_BAR;
  const firstBar = off - Math.floor(off / bar) * bar; // 0 ≤ firstBar < one bar
  const start = firstBar - Math.floor(firstBar / period) * period; // first beat at or after 0
  const end = Math.max(duration, 900) + period;
  const beats: number[] = [];
  for (let i = 0; start + i * period <= end; i++) beats.push(start + i * period);
  return { beats, firstDownbeat: Math.round((firstBar - start) / period), bpm: sync.bpm };
}
