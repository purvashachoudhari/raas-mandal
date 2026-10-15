import type { SongErrorKey } from "../data/strings";
import type { Library } from "./library";
import { MAX_BPM, MIN_BPM, MIN_TAPS, TAP_RESET_S, fitTapLine, loadSync, saveSync, syncGrid, type BeatGrid, type TapSync } from "./tapSync";
import type { YouTubePlayer } from "./youtube";

export type TapResult = "need-playing" | "counting" | "applied";

/**
 * The selected song and its beat (§5.8): the YouTube player, plus the tempo and timing the user set
 * by tapping along or typing the tempo. Unsynced songs follow the default 120 bpm.
 */
export interface SongSession {
  /** The selected song's id, or null. */
  readonly songId: string | null;
  /** The saved sync, or null while at the default tempo. */
  readonly sync: TapSync | null;
  /** Why the current song can't play, if it can't. */
  readonly error: SongErrorKey | null;
  select(id: string | null): Promise<void>;
  /** The beats the dancers follow, or null at the default tempo. */
  grid(): BeatGrid | null;
  readonly tapCount: number;
  /** Tap on a beat while the song plays: after 4 taps the tempo and timing lock on; more taps refine them. */
  tap(): TapResult;
  /** Set the tempo by typing it, keeping the current timing (or starting the beat at the song's start). */
  setBpm(bpm: number): void;
  /** Clear the saved sync, back to the default 120 bpm. */
  reset(): void;
  subscribe(fn: () => void): () => void;
}

export function createSongSession(library: Library, youtube: YouTubePlayer): SongSession {
  let songId: string | null = null;
  let videoId: string | null = null;
  let sync: TapSync | null = null;
  let grid: BeatGrid | null = null;
  let error: SongErrorKey | null = null;
  let taps: number[] = [];
  let token = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  function setSync(next: TapSync | null) {
    if (!videoId || !songId) return;
    sync = next;
    saveSync(videoId, next);
    grid = next ? syncGrid(next, youtube.duration) : null;
    library.setSynced(songId, next ? Math.round(next.bpm) : null);
    notify();
  }

  // Errors can also arrive later (embedding is often refused only when playback starts),
  // and a user-added link learns its real title once the video plays.
  youtube.subscribe((e) => {
    if (!songId) return;
    if (e === "error") {
      error = youtube.error;
      library.setState(songId, "error");
      notify();
    } else if (e === "play" || e === "ready") {
      const song = library.find(songId);
      const title = youtube.title();
      if (song?.origin === "link" && title) library.setTitle(song.id, title);
      if (song && youtube.duration) library.setState(song.id, "ready", youtube.duration);
    }
  });

  async function select(id: string | null) {
    const song = library.find(id);
    if (song && song.id === songId && youtube.id === song.videoId && (youtube.loaded || youtube.loading)) return;
    const my = ++token;
    const previous = library.find(songId);
    if (previous && previous.state !== "error") library.setState(previous.id, "idle");
    songId = song?.id ?? null;
    videoId = song?.videoId ?? null;
    sync = videoId ? loadSync(videoId) : null;
    grid = null;
    error = null;
    taps = [];
    notify();
    if (!song) {
      youtube.unload();
      return;
    }
    library.setState(song.id, "loading");
    const result = await youtube.load(song.videoId);
    if (my !== token) return;
    if (!result.ok) {
      error = result.error === "replaced" ? null : result.error;
      library.setState(song.id, "error");
      notify();
      return;
    }
    library.setState(song.id, "ready", youtube.duration || undefined);
    grid = sync ? syncGrid(sync, youtube.duration) : null;
    notify();
  }

  return {
    select,
    grid: () => grid,
    get songId() { return songId; },
    get sync() { return sync; },
    get error() { return error; },
    get tapCount() { return taps.length; },
    tap() {
      if (!youtube.playing) return "need-playing";
      const t = youtube.currentTime();
      const last = taps[taps.length - 1];
      if (last !== undefined && (t - last > TAP_RESET_S || t < last)) taps = [];
      taps.push(t);
      const fit = taps.length >= MIN_TAPS ? fitTapLine(taps) : null;
      if (fit && fit.bpm >= MIN_BPM && fit.bpm <= MAX_BPM) {
        setSync(fit);
        return "applied";
      }
      notify();
      return "counting";
    },
    setBpm(bpm) {
      if (!Number.isFinite(bpm)) return;
      setSync({ bpm: Math.min(MAX_BPM, Math.max(MIN_BPM, bpm)), offset: sync?.offset ?? 0 });
    },
    reset() {
      taps = [];
      setSync(null);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
