import { gauss } from "../util/math";

// Beat-clock helpers for everything that pulses. They take the beat position (which is negative
// before a song's first beat, and frozen while paused), never wall-clock time.

/** Position within the current beat, 0–1, also for negative beat positions. */
export const beatFrac = (beat: number) => beat - Math.floor(beat);

/** Modulo that stays positive, for chase patterns indexed by beat. */
export const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Sharp attack exactly on each beat, then decay: glows, flashes, twinkles. */
export const flash = (beat: number, decay = 0.12) => Math.exp(-beatFrac(beat) / decay);

/** Symmetric bump peaking at a point in the beat (0 = on the beat, 0.5 = off-beat): strikes and glints. */
export function bump(beat: number, at = 0, width = 0.08): number {
  const f = beatFrac(beat - at);
  return gauss(f, 0, width) + gauss(f, 1, width);
}

/** Flame flicker. Its phase is the beat while a song plays (so a paused stage holds still), and slow wall-clock time at rest. */
export const flicker = (beat: number, seed = 0) => 1 + 0.08 * Math.sin(beat * 8.5 + seed) + 0.05 * Math.sin(beat * 14.5 + seed * 1.7);
