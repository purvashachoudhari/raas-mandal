import { AUDIO_EXTENSIONS, type Manifest } from "./manifest";

export type SongState = "idle" | "loading" | "ready" | "error";

export interface AnalysisStatus {
  state: "none" | "analysing" | "ready" | "error";
  /** 0–1 while analysing. */
  progress: number;
  /** Effective tempo (after corrections) and detection confidence once ready. */
  bpm: number | null;
  confidence: number | null;
}

const NOT_ANALYSED: AnalysisStatus = { state: "none", progress: 0, bpm: null, confidence: null };

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  /** Seconds, or null until known. */
  duration: number | null;
  /** Where the song came from: the project's music/ folder or a file dropped in this session. */
  origin: "folder" | "added";
  state: SongState;
  analysis: AnalysisStatus;
  /** SHA-1 of the file's bytes, once read. */
  hash?: string;
  read(): Promise<ArrayBuffer>;
}

export interface Library {
  songs(): readonly Song[];
  find(id: string | null): Song | undefined;
  /** False when there is no manifest (e.g. the deployed site). */
  readonly hasManifest: boolean;
  loadManifest(): Promise<void>;
  /** Add audio files; returns the songs added (non-audio files are skipped). */
  addFiles(files: Iterable<File>): Song[];
  setState(id: string, state: SongState, duration?: number): void;
  setAnalysis(id: string, patch: Partial<AnalysisStatus>): void;
  subscribe(fn: () => void): () => void;
}

export function isAudioFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
}

const titleFromName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim() || name;

/** Read a file's duration from its metadata without decoding the whole thing. */
function probeDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    const done = (d: number | null) => { URL.revokeObjectURL(url); resolve(d); };
    a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => done(null);
    a.src = url;
  });
}

export function createLibrary(): Library {
  const songs: Song[] = [];
  let hasManifest = false;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    songs: () => songs,
    find: (id) => (id ? songs.find((s) => s.id === id) : undefined),
    get hasManifest() { return hasManifest; },

    async loadManifest() {
      try {
        const res = await fetch("music/manifest.json", { cache: "no-cache" });
        if (!res.ok) return;
        const manifest = (await res.json()) as Manifest;
        hasManifest = true;
        for (const m of manifest.songs ?? []) {
          const url = `music/${encodeURIComponent(m.file)}`;
          songs.push({
            id: `music:${m.file}`,
            title: m.title,
            artist: m.artist,
            duration: m.duration,
            origin: "folder",
            state: "idle",
            analysis: { ...NOT_ANALYSED },
            read: async () => {
              const r = await fetch(url);
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.arrayBuffer();
            },
          });
        }
      } catch {
        // No manifest (deployed site, or npm run music not run yet): drag and drop still works.
      } finally {
        notify();
      }
    },

    addFiles(files) {
      const added: Song[] = [];
      for (const file of files) {
        if (!isAudioFile(file)) continue;
        const id = `file:${file.name}:${file.size}:${file.lastModified}`;
        const existing = songs.find((s) => s.id === id);
        if (existing) { added.push(existing); continue; }
        const song: Song = {
          id,
          title: titleFromName(file.name),
          artist: null,
          duration: null,
          origin: "added",
          state: "idle",
          analysis: { ...NOT_ANALYSED },
          read: () => file.arrayBuffer(),
        };
        songs.push(song);
        added.push(song);
        void probeDuration(file).then((d) => { if (d !== null && song.duration === null) { song.duration = d; notify(); } });
      }
      if (added.length) notify();
      return added;
    },

    setState(id, state, duration) {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      song.state = state;
      if (duration !== undefined) song.duration = duration;
      notify();
    },

    setAnalysis(id, patch) {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      song.analysis = { ...song.analysis, ...patch };
      notify();
    },

    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function formatTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "–:––";
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
