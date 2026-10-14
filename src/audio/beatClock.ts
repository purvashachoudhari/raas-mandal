import type { BeatGrid } from "../analysis/corrections";
import type { Playback } from "./player";

export interface BeatClock {
  /** Current beat position (beat index + fraction): drives every pulse, clap and hop. */
  beat(): number;
  /**
   * Position in the step sequence, in beats counted from the first downbeat,
   * or null before the first downbeat (the dancers wait for it).
   */
  stepBeat(): number | null;
  /** Current local tempo in beats per minute. */
  bpm(): number;
  readonly paused: boolean;
  pause(): void;
  resume(): void;
  restart(): void;
}

/** Fixed tempo used with no song, and while a song's beats are still being analysed. */
export const PREVIEW_BPM = 120;

/** Free-running clock at a fixed tempo, used when no song is loaded. */
export function createPreviewClock(bpm = PREVIEW_BPM): BeatClock {
  const now = () => performance.now() / 1000;
  let anchorTime = now();
  let anchorBeat = 0;
  let paused = false;

  const beat = () => (paused ? anchorBeat : anchorBeat + ((now() - anchorTime) * bpm) / 60);

  return {
    beat,
    stepBeat: beat,
    bpm: () => bpm,
    get paused() {
      return paused;
    },
    pause() {
      if (paused) return;
      anchorBeat = beat();
      paused = true;
    },
    resume() {
      if (!paused) return;
      anchorTime = now();
      paused = false;
    },
    restart() {
      anchorBeat = 0;
      anchorTime = now();
    },
  };
}

/** Index of the last beat at or before t (−1 if before the first). */
function beatIndex(beats: number[], t: number): number {
  let lo = 0, hi = beats.length - 1;
  if (t < beats[0]) return -1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (beats[mid] <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Audio time → beat position: binary-search the beats for index i and fraction f, position = i + f.
 * Before the first and after the last beat it extrapolates with the nearest interval.
 */
export function beatPosition(beats: number[], t: number): number {
  const n = beats.length;
  if (n < 2) return 0;
  const i = beatIndex(beats, t);
  if (i < 0) return (t - beats[0]) / (beats[1] - beats[0]);
  if (i >= n - 1) return n - 1 + (t - beats[n - 1]) / (beats[n - 1] - beats[n - 2]);
  return i + (t - beats[i]) / (beats[i + 1] - beats[i]);
}

/** Local tempo around a beat position, from the surrounding beat intervals. */
function localBpm(beats: number[], pos: number): number {
  const n = beats.length;
  const i = Math.max(0, Math.min(n - 2, Math.floor(pos)));
  const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 2);
  return (60 * (b - a)) / (beats[b] - beats[a]);
}

/**
 * The one clock while a song is loaded: the song's playback position, mapped to the detected
 * beats when the analysis is ready, or to a steady preview tempo until then.
 */
export function createSongClock(player: Playback, grid: () => BeatGrid | null): BeatClock {
  const position = () => {
    const g = grid();
    const t = player.currentTime();
    return g && g.beats.length >= 2 ? beatPosition(g.beats, t) : (t * PREVIEW_BPM) / 60;
  };
  return {
    beat: position,
    stepBeat() {
      const g = grid();
      const pos = position();
      if (!g || g.beats.length < 2) return pos;
      const fromDownbeat = pos - g.firstDownbeat;
      return fromDownbeat >= 0 ? fromDownbeat : null;
    },
    bpm() {
      const g = grid();
      return g && g.beats.length >= 4 ? localBpm(g.beats, position()) : PREVIEW_BPM;
    },
    get paused() {
      return !player.playing;
    },
    pause: () => player.pause(),
    resume: () => player.play(),
    restart: () => player.seek(0),
  };
}
