import type { Playback, PlayerEvent } from "./player";

// YouTube songs (§5.7) play through the YouTube IFrame Player API. The player must stay visible,
// so it lives in a small framed screen that main.ts positions over the stage or the Play panel.

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

/** Messages for the IFrame API's error codes. */
export function youtubeErrorMessage(code: number): string {
  if (code === 101 || code === 150 || code === 153) return "This video's owner doesn't allow it to play on other sites. Try a different upload.";
  if (code === 100) return "That video isn't available: it may be private or removed.";
  if (code === 2) return "That doesn't look like a valid YouTube video. Check the link.";
  return "YouTube couldn't play this video. Try again, or try a different upload.";
}

export type YouTubeLoad = { ok: true } | { ok: false; message: string };

export interface YouTubePlayer extends Playback {
  /** Cue a video (without playing). Resolves when it's ready or failed. */
  load(videoId: string): Promise<YouTubeLoad>;
  /** The video's title as YouTube reports it (empty until known). */
  title(): string;
  /** The last error message, if the current video failed. */
  readonly error: string | null;
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
  let error: string | null = null;
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
    if (!result.ok) error = result.message;
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
    const message = youtubeErrorMessage(e.data);
    if (loading) finish({ ok: false, message });
    else { error = message; state = -1; emit("error"); }
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
      settle?.({ ok: false, message: "replaced" });
      emit("loading");
      let api: YTNamespace;
      try {
        api = await loadApi();
      } catch {
        if (id === videoId) finish({ ok: false, message: "YouTube couldn't load. Check your internet connection, or that YouTube isn't blocked." });
        return { ok: false, message: "YouTube couldn't load." };
      }
      if (id !== videoId) return { ok: false, message: "replaced" };
      return new Promise<YouTubeLoad>((resolve) => {
        settle = resolve;
        const timeout = setTimeout(() => { if (settle === resolve && id === videoId) finish({ ok: false, message: "YouTube didn't respond. Try again." }); }, 15000);
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
      settle?.({ ok: false, message: "replaced" });
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
