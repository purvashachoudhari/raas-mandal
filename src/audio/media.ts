import type { Playback, PlayerEvent } from "./player";

export type SongSource = "file" | "youtube";

/** One playback interface over both song sources; everything else talks to this. */
export interface Media extends Playback {
  readonly source: SongSource | null;
  use(source: SongSource | null): void;
}

export function createMedia(file: Playback, youtube: Playback): Media {
  let source: SongSource | null = null;
  const active = (): Playback | null => (source === "file" ? file : source === "youtube" ? youtube : null);
  const listeners = new Set<(e: PlayerEvent) => void>();
  for (const [kind, p] of [["file", file], ["youtube", youtube]] as const) {
    p.subscribe((e) => { if (source === kind) listeners.forEach((l) => l(e)); });
  }
  return {
    get source() { return source; },
    use(next) {
      if (next === source) return;
      active()?.pause();
      source = next;
      listeners.forEach((l) => l("unload"));
    },
    unload: () => active()?.unload(),
    play: () => active()?.play(),
    pause: () => active()?.pause(),
    toggle: () => active()?.toggle(),
    seek: (t) => active()?.seek(t),
    currentTime: () => active()?.currentTime() ?? 0,
    get id() { return active()?.id ?? null; },
    get loaded() { return active()?.loaded ?? false; },
    get loading() { return active()?.loading ?? false; },
    get playing() { return active()?.playing ?? false; },
    get duration() { return active()?.duration ?? 0; },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
