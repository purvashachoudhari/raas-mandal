import { get, set } from "idb-keyval";
import type { BeatMap } from "../state/types";
import type { Corrections } from "./corrections";
import { ANALYSIS_VERSION } from "./pipeline";

// IndexedDB keys: results are keyed by the SHA-1 of the file's bytes plus the analysis version,
// so a song is analysed once no matter how it was added.

export async function sha1(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const mapKey = (hash: string) => `beatmap:${hash}:v${ANALYSIS_VERSION}`;
const corrKey = (hash: string) => `corrections:${hash}`;
const songKey = (songId: string) => `song:${songId}`;

/** IndexedDB can be unavailable (private windows, blocked storage): treat that as a cache miss. */
async function safe<T>(op: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await op();
  } catch {
    return fallback;
  }
}

export const loadBeatMap = (hash: string) => safe(() => get<BeatMap>(mapKey(hash)), undefined);
export const saveBeatMap = (hash: string, map: BeatMap) => safe(() => set(mapKey(hash), map), undefined);
export const loadCorrections = (hash: string) => safe(() => get<Corrections>(corrKey(hash)), undefined);
export const saveCorrections = (hash: string, c: Corrections) => safe(() => set(corrKey(hash), c), undefined);

/** Remember which file hash a song id had, so the list can show cached results before reading the file. */
export const loadSongHash = (songId: string) => safe(() => get<string>(songKey(songId)), undefined);
export const saveSongHash = (songId: string, hash: string) => safe(() => set(songKey(songId), hash), undefined);
