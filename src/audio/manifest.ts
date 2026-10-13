/** Shape of music/manifest.json, written by `npm run music` (scripts/build-manifest.ts). */
export interface ManifestSong {
  /** File name inside music/. */
  file: string;
  title: string;
  artist: string | null;
  /** Seconds, or null if it couldn't be read. */
  duration: number | null;
}

export interface Manifest {
  version: 1;
  generated: string;
  songs: ManifestSong[];
}

export const AUDIO_EXTENSIONS = [".mp3", ".m4a", ".wav", ".ogg"] as const;
