import type { SongErrorKey } from "../data/strings";

// Songs (§5.7) play through the YouTube IFrame Player API. The player must stay visible, so it
// lives in a small framed screen that main.ts positions in the Music section or the Play mode corner.

/** Accepts any YouTube link format (watch, youtu.be, shorts, embed, live, music, mobile) or a bare ID. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = url.searchParams.get("v");
    if (!id) {
      const m = url.pathname.match(/^\/(?:shorts|embed|live|v|e)\/([\w-]{11})/);
      id = m ? m[1] : null;
    }
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** Error for the IFrame API's error codes (the message text is in data/strings.ts). */
export function youtubeError(code: number): SongErrorKey {
  if (code === 101 || code === 150 || code === 153) return "ytBlocked";
  if (code === 100) return "ytUnavailable";
  if (code === 2) return "ytInvalid";
  return "ytFailed";
}

/** "replaced": a newer load (or an unload) took over before this one finished. */
export type YouTubeLoad = { ok: true } | { ok: false; error: SongErrorKey | "replaced" };

export type PlayerEvent = "loading" | "ready" | "error" | "play" | "pause" | "seek" | "ended" | "unload";

export interface YouTubePlayer {
  /** Cue a video (without playing). Resolves when it's ready or failed. */
  load(videoId: string): Promise<YouTubeLoad>;
  unload(): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  /** Playback position in seconds: the clock everything animates from while a song is loaded. */
  currentTime(): number;
  /** The cued video's ID. */
  readonly id: string | null;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly playing: boolean;
  readonly duration: number;
  subscribe(fn: (event: PlayerEvent) => void): () => void;
  /** The video's title as YouTube reports it (empty until known). */
  title(): string;
  /** Why the current video failed, if it did. */
  readonly error: SongErrorKey | null;
}

/* Minimal types for the parts of the IFrame API used here. */
interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  cueVideoById(id: string): void;
  getCurrentTime(): number;
  getDuration(): number;
  getVideoData?(): { title?: string };
}
interface YTNamespace {
  Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
}
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise<YTNamespace>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), 12000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timer); resolve(window.YT!); };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.onerror = () => { clearTimeout(timer); reject(new Error("blocked")); };
    document.head.append(script);
  }).catch((e) => { apiPromise = null; throw e; });
  return apiPromise;
}

const PLAYING = 1, PAUSED = 2, ENDED = 0, CUED = 5;

export function createYouTubePlayer(frame: HTMLElement): YouTubePlayer {
  let yt: YTPlayer | null = null;
  let ready = false;
  let id: string | null = null;
  let loading = false;
  let error: SongErrorKey | null = null;
  let state = -1;
  let settle: ((r: YouTubeLoad) => void) | null = null;
  const listeners = new Set<(e: PlayerEvent) => void>();
  const emit = (e: PlayerEvent) => listeners.forEach((l) => l(e));

  // getCurrentTime() only updates every few hundred ms, so between updates the time runs on from
  // the last reading and is gently pulled back towards each new one.
  let base = 0, basePerf = 0, lastRaw = -1;
  // Right after a seek YouTube still reports the old time for a moment; trust the seek target
  // until a reading near it arrives (or a second passes).
  let seekTarget: number | null = null, seekUntil = 0;
  const now = () => performance.now() / 1000;
  function resync(t: number) { base = t; basePerf = now(); lastRaw = -1; }

  function finish(result: YouTubeLoad) {
    loading = false;
    if (!result.ok && result.error !== "replaced") error = result.error;
    settle?.(result);
    settle = null;
    emit(result.ok ? "ready" : "error");
  }

  function onStateChange(e: { data: number }) {
    const was = state;
    state = e.data;
    if (state === CUED && loading) finish({ ok: true });
    if (state === PLAYING) { resync(yt?.getCurrentTime() ?? base); emit("play"); }
    else if (was === PLAYING && state === PAUSED) { resync(yt?.getCurrentTime() ?? base); emit("pause"); }
    else if (state === ENDED) { resync(yt?.getDuration() ?? base); emit("ended"); }
  }

  function onError(e: { data: number }) {
    const failure = youtubeError(e.data);
    if (loading) finish({ ok: false, error: failure });
    else { error = failure; state = -1; emit("error"); }
  }

  const playing = () => !!yt && ready && !error && state === PLAYING;

  /** Playback position, smoothed between YouTube's coarse updates. */
  function currentTime(): number {
    if (!yt || !ready || !id) return 0;
    let raw = yt.getCurrentTime() || 0;
    const t = now();
    if (seekTarget !== null) {
      if (Math.abs(raw - seekTarget) < 1 || t > seekUntil) seekTarget = null;
      else raw = playing() ? base + (t - basePerf) : seekTarget;
    }
    if (!playing()) { resync(raw); return raw; }
    const est = base + (t - basePerf);
    if (raw !== lastRaw) {
      lastRaw = raw;
      base = Math.abs(est - raw) > 0.25 ? raw : est + (raw - est) * 0.15;
      basePerf = t;
      return base;
    }
    return est;
  }

  return {
    async load(videoId) {
      id = videoId;
      error = null;
      loading = true;
      state = -1;
      resync(0);
      settle?.({ ok: false, error: "replaced" });
      emit("loading");
      let api: YTNamespace;
      try {
        api = await loadApi();
      } catch {
        if (id === videoId) finish({ ok: false, error: "ytNoApi" });
        return { ok: false, error: "ytNoApi" };
      }
      if (id !== videoId) return { ok: false, error: "replaced" };
      return new Promise<YouTubeLoad>((resolve) => {
        settle = resolve;
        const timeout = setTimeout(() => { if (settle === resolve && id === videoId) finish({ ok: false, error: "ytNoResponse" }); }, 15000);
        const done = settle;
        settle = (r) => { clearTimeout(timeout); done(r); };
        if (!yt) {
          const host = document.createElement("div");
          frame.replaceChildren(host);
          yt = new api.Player(host, {
            host: "https://www.youtube-nocookie.com",
            videoId,
            width: "100%",
            height: "100%",
            playerVars: { playsinline: 1, rel: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, origin: location.origin },
            events: {
              onReady: () => { ready = true; if (loading) finish({ ok: true }); },
              onStateChange,
              onError,
            },
          });
        } else {
          yt.cueVideoById(videoId);
        }
      });
    },
    unload() {
      if (yt && ready) yt.stopVideo();
      settle?.({ ok: false, error: "replaced" });
      settle = null;
      id = null;
      loading = false;
      error = null;
      state = -1;
      resync(0);
      emit("unload");
    },
    play() {
      if (yt && ready && !error) yt.playVideo();
    },
    pause() {
      if (yt && ready) yt.pauseVideo();
    },
    toggle() {
      if (playing()) yt!.pauseVideo();
      else if (yt && ready && !error) yt.playVideo();
    },
    seek(seconds) {
      if (!yt || !ready) return;
      const t = Math.max(0, Math.min(seconds, yt.getDuration() || seconds));
      const from = currentTime();
      yt.seekTo(t, true);
      resync(t);
      if (Math.abs(t - from) > 0.5) { seekTarget = t; seekUntil = now() + 1.2; }
      emit("seek");
    },
    currentTime,
    title: () => (yt && ready ? yt.getVideoData?.().title ?? "" : ""),
    get error() { return error; },
    get id() { return id; },
    get loaded() { return !!id && ready && !loading && !error; },
    get loading() { return loading; },
    get playing() { return playing(); },
    get duration() { return yt && ready && id ? yt.getDuration() || 0 : 0; },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
