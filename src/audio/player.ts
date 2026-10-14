export type PlayerEvent = "loading" | "ready" | "error" | "play" | "pause" | "seek" | "ended" | "unload";

/** What the clock, the panels and the keyboard need from any song source (local file or YouTube). */
export interface Playback {
  unload(): void;
  play(): void;
  pause(): void;
  toggle(): void;
  seek(seconds: number): void;
  /** Playback position in seconds: the clock everything animates from while a song is loaded. */
  currentTime(): number;
  readonly id: string | null;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly playing: boolean;
  readonly duration: number;
  subscribe(fn: (event: PlayerEvent) => void): () => void;
}

/** Local song files: decoded with Web Audio, so their beats can be analysed. */
export interface Player extends Playback {
  /** Fetch and decode a song. Resolves false if it failed or a newer load replaced it. */
  load(id: string, read: () => Promise<ArrayBuffer>): Promise<boolean>;
  /** Decoded audio, for beat analysis (M4). */
  readonly buffer: AudioBuffer | null;
}

/** Decodes the whole song with Web Audio and plays it from an AudioBufferSourceNode. */
export function createPlayer(): Player {
  let ctx: AudioContext | null = null;
  let gain: GainNode | null = null;
  let buffer: AudioBuffer | null = null;
  let source: AudioBufferSourceNode | null = null;
  let id: string | null = null;
  let loading = false;
  let playing = false;
  let playWhenReady = false;
  let offset = 0; // song position when (re)started or paused
  let startedAt = 0; // ctx.currentTime when started
  let loadToken = 0;
  const listeners = new Set<(e: PlayerEvent) => void>();
  const emit = (e: PlayerEvent) => listeners.forEach((l) => l(e));

  function audio() {
    if (!ctx) {
      ctx = new AudioContext();
      gain = ctx.createGain();
      gain.connect(ctx.destination);
    }
    return ctx;
  }

  const duration = () => buffer?.duration ?? 0;

  function currentTime() {
    if (!playing || !ctx) return offset;
    // Subtract output latency so dancers match what is heard, not what was just scheduled.
    const t = offset + ctx.currentTime - startedAt - (ctx.outputLatency || 0);
    return Math.max(offset, Math.min(duration(), t));
  }

  function stopSource() {
    if (!source) return;
    source.onended = null;
    try { source.stop(); } catch { /* already stopped */ }
    source.disconnect();
    source = null;
  }

  function play() {
    if (!buffer) {
      if (loading) playWhenReady = true;
      return;
    }
    if (playing) return;
    const c = audio();
    void c.resume();
    if (offset >= duration() - 0.05) offset = 0;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.connect(gain!);
    src.onended = () => {
      if (src !== source) return;
      source = null;
      playing = false;
      offset = duration();
      emit("ended");
    };
    src.start(0, offset);
    source = src;
    startedAt = c.currentTime;
    playing = true;
    emit("play");
  }

  function pause() {
    playWhenReady = false;
    if (!playing) return;
    offset = currentTime();
    stopSource();
    playing = false;
    emit("pause");
  }

  function unload() {
    loadToken++;
    stopSource();
    buffer = null;
    id = null;
    loading = playing = playWhenReady = false;
    offset = 0;
    emit("unload");
  }

  return {
    async load(songId, read) {
      unload();
      const token = loadToken;
      id = songId;
      loading = true;
      emit("loading");
      try {
        const bytes = await read();
        const decoded = await audio().decodeAudioData(bytes);
        if (token !== loadToken) return false;
        buffer = decoded;
        loading = false;
        emit("ready");
        if (playWhenReady) { playWhenReady = false; play(); }
        return true;
      } catch {
        if (token !== loadToken) return false;
        loading = false;
        buffer = null;
        emit("error");
        return false;
      }
    },
    unload,
    play,
    pause,
    toggle: () => (playing ? pause() : play()),
    seek(seconds) {
      if (!buffer) return;
      const wasPlaying = playing;
      if (wasPlaying) { stopSource(); playing = false; }
      offset = Math.max(0, Math.min(duration(), seconds));
      if (wasPlaying) play();
      emit("seek");
    },
    currentTime,
    get id() { return id; },
    get loaded() { return buffer !== null; },
    get loading() { return loading; },
    get playing() { return playing; },
    get duration() { return duration(); },
    get buffer() { return buffer; },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
