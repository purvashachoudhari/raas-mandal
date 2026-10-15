import { YOUTUBE_SONGS } from "../data/youtubeSongs";
import { loadSync } from "./tapSync";

export type SongState = "idle" | "loading" | "ready" | "error";

/** A YouTube song: from the starter list that ships with the site, or a link the user added. */
export interface Song {
  id: string;
  title: string;
  artist: string | null;
  /** Seconds, or null until known. */
  duration: number | null;
  origin: "starter" | "link";
  videoId: string;
  /** Tempo once synced (tapped or typed), or null at the default 120 bpm. */
  syncedBpm: number | null;
  state: SongState;
}

export interface Library {
  songs(): readonly Song[];
  find(id: string | null): Song | undefined;
  setState(id: string, state: SongState, duration?: number): void;
  /** Add a YouTube video by ID (kept across reloads); returns the existing song if already listed. */
  addYouTube(videoId: string): Song;
  /** Remove a YouTube link the user added. */
  removeYouTube(id: string): void;
  /** Name a user-added YouTube song once its title is known. */
  setTitle(id: string, title: string): void;
  setSynced(id: string, bpm: number | null): void;
  subscribe(fn: () => void): () => void;
}

const LINKS_KEY = "raasMandal.youtubeLinks.v1";
const ytId = (videoId: string) => `yt:${videoId}`;

function savedLinks(): { videoId: string; title: string }[] {
  try {
    const v = JSON.parse(localStorage.getItem(LINKS_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => x && typeof x.videoId === "string") : [];
  } catch {
    return [];
  }
}

function youtubeSong(videoId: string, title: string, artist: string | null, origin: Song["origin"]): Song {
  const bpm = loadSync(videoId)?.bpm;
  return { id: ytId(videoId), title, artist, duration: null, origin, videoId, syncedBpm: bpm ? Math.round(bpm) : null, state: "idle" };
}

export function createLibrary(): Library {
  const songs: Song[] = [
    ...YOUTUBE_SONGS.map((y) => youtubeSong(y.videoId, y.title, y.artist, "starter")),
    ...savedLinks().filter((l) => !YOUTUBE_SONGS.some((y) => y.videoId === l.videoId)).map((l) => youtubeSong(l.videoId, l.title, null, "link")),
  ];
  const persistLinks = () => {
    try {
      localStorage.setItem(LINKS_KEY, JSON.stringify(songs.filter((x) => x.origin === "link").map((x) => ({ videoId: x.videoId, title: x.title }))));
    } catch {
      // Storage unavailable: links last until reload.
    }
  };
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((l) => l());

  return {
    songs: () => songs,
    find: (id) => (id ? songs.find((s) => s.id === id) : undefined),

    setState(id, state, duration) {
      const song = songs.find((s) => s.id === id);
      if (!song) return;
      song.state = state;
      if (duration !== undefined) song.duration = duration;
      notify();
    },

    addYouTube(videoId) {
      const existing = songs.find((x) => x.id === ytId(videoId));
      if (existing) return existing;
      const song = youtubeSong(videoId, "YouTube video", null, "link");
      songs.push(song);
      persistLinks();
      notify();
      return song;
    },

    removeYouTube(id) {
      const i = songs.findIndex((x) => x.id === id && x.origin === "link");
      if (i < 0) return;
      songs.splice(i, 1);
      persistLinks();
      notify();
    },

    setTitle(id, title) {
      const song = songs.find((x) => x.id === id);
      if (!song || !title || song.title === title) return;
      song.title = title;
      if (song.origin === "link") persistLinks();
      notify();
    },

    setSynced(id, bpm) {
      const song = songs.find((x) => x.id === id);
      if (!song) return;
      song.syncedBpm = bpm;
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
