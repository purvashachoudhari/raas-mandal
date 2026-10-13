import { loadBeatMap, loadCorrections, loadSongHash, saveBeatMap, saveCorrections, saveSongHash, sha1 } from "../analysis/cache";
import { prepareSamples, runAnalysis, type AnalysisJob } from "../analysis/client";
import { NO_CORRECTIONS, TAPS_NEEDED, applyCorrections, fitTaps, type BeatGrid, type Corrections } from "../analysis/corrections";
import type { BeatMap } from "../state/types";
import type { Library } from "./library";
import type { Player } from "./player";

/** Below this confidence the panel suggests tapping to correct (§8). */
export const LOW_CONFIDENCE = 0.35;
/** Taps further apart than this start a new set. */
const TAP_RESET_S = 2.5;

export type TapResult = "need-playing" | "counting" | "applied";

/** The active song: loading, its beat analysis (cached, or run in a worker) and manual corrections. */
export interface SongSession {
  select(id: string | null): Promise<void>;
  /** Show cached analysis results in the song list without reading the files. */
  restoreStatuses(): Promise<void>;
  /** The beats the dancers follow, or null while not analysed. */
  grid(): BeatGrid | null;
  readonly map: BeatMap | null;
  readonly corrections: Corrections;
  readonly tapCount: number;
  nudge(ms: number): void;
  halve(): void;
  double(): void;
  tap(): TapResult;
  resetCorrections(): void;
  subscribe(fn: () => void): () => void;
}

export function createSongSession(library: Library, player: Player): SongSession {
  let map: BeatMap | null = null;
  let corrections: Corrections = NO_CORRECTIONS;
  let grid: BeatGrid | null = null;
  let hash: string | null = null;
  let songId: string | null = null;
  let job: AnalysisJob | null = null;
  let token = 0;
  let taps: number[] = [];
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  function setMap(m: BeatMap | null, c: Corrections) {
    map = m;
    corrections = c;
    grid = m ? applyCorrections(m, c) : null;
    taps = [];
    notify();
  }

  function publishStatus() {
    if (songId && map && grid) {
      library.setAnalysis(songId, { state: "ready", progress: 1, bpm: Math.round(grid.bpm), confidence: map.confidence });
    }
  }

  function updateCorrections(c: Corrections) {
    if (!map || !hash) return;
    corrections = c;
    grid = applyCorrections(map, c);
    void saveCorrections(hash, c);
    publishStatus();
    notify();
  }

  async function select(id: string | null) {
    const song = library.find(id);
    if (song && player.id === song.id && (player.loaded || player.loading)) return;
    const my = ++token;
    job?.cancel();
    job = null;
    // Only one song is active: an unfinished analysis of the previous song goes back to "Not analysed".
    for (const s of library.songs()) if (s.analysis.state === "analysing") library.setAnalysis(s.id, { state: "none", progress: 0 });
    const previous = library.find(player.id);
    if (previous && previous.state !== "error") library.setState(previous.id, "idle");
    hash = null;
    songId = song?.id ?? null;
    setMap(null, NO_CORRECTIONS);
    if (!song) {
      player.unload();
      return;
    }

    library.setState(song.id, "loading");
    let bytes: ArrayBuffer;
    try {
      bytes = await song.read();
    } catch {
      if (my === token) library.setState(song.id, "error");
      return;
    }
    if (my !== token) return;
    // Hash before decoding: decoding takes ownership of the bytes.
    const h = await sha1(bytes);
    song.hash = h;
    void saveSongHash(song.id, h);
    if (my !== token) return;

    const ok = await player.load(song.id, async () => bytes);
    if (my !== token) return;
    library.setState(song.id, ok ? "ready" : "error", ok ? player.duration : undefined);
    if (!ok || !player.buffer) return;
    hash = h;

    const [cached, saved] = await Promise.all([loadBeatMap(h), loadCorrections(h)]);
    if (my !== token) return;
    if (cached) {
      setMap(cached, saved ?? NO_CORRECTIONS);
      publishStatus();
      return;
    }

    library.setAnalysis(song.id, { state: "analysing", progress: 0 });
    try {
      const samples = await prepareSamples(player.buffer);
      if (my !== token) return;
      job = runAnalysis(samples, (p) => { if (my === token) library.setAnalysis(song.id, { progress: p }); });
      const result = await job.result;
      job = null;
      if (my !== token) return;
      void saveBeatMap(h, result);
      setMap(result, saved ?? NO_CORRECTIONS);
      publishStatus();
    } catch {
      if (my === token) library.setAnalysis(song.id, { state: "error", progress: 0 });
    }
  }

  return {
    select,
    async restoreStatuses() {
      await Promise.all(
        library.songs().map(async (s) => {
          if (s.analysis.state !== "none") return;
          const h = await loadSongHash(s.id);
          const m = h ? await loadBeatMap(h) : undefined;
          if (!h || !m) return;
          const g = applyCorrections(m, (await loadCorrections(h)) ?? NO_CORRECTIONS);
          if (s.analysis.state === "none") library.setAnalysis(s.id, { state: "ready", progress: 1, bpm: Math.round(g.bpm), confidence: m.confidence });
        }),
      );
    },
    grid: () => grid,
    get map() { return map; },
    get corrections() { return corrections; },
    get tapCount() { return taps.length; },
    nudge: (ms) => updateCorrections({ ...corrections, offsetMs: corrections.offsetMs + ms }),
    halve: () => updateCorrections({ ...corrections, factor: corrections.factor === 2 ? 1 : 0.5 }),
    double: () => updateCorrections({ ...corrections, factor: corrections.factor === 0.5 ? 1 : 2 }),
    resetCorrections: () => updateCorrections(NO_CORRECTIONS),
    tap() {
      if (!map || !player.playing) return "need-playing";
      const t = player.currentTime();
      const last = taps[taps.length - 1];
      if (last !== undefined && (t - last > TAP_RESET_S || t < last)) taps = [];
      taps.push(t);
      if (taps.length >= TAPS_NEEDED) {
        const fitted = fitTaps(map, corrections, taps);
        taps = [];
        updateCorrections(fitted);
        return "applied";
      }
      notify();
      return "counting";
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
