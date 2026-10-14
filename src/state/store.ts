import { CENTRE_IDS, DECOR_IDS } from "../data/festive";
import { tonight } from "../data/nights";
import { PRINT_IDS } from "../data/prints";
import { DEFAULT_SEQUENCE, LEGACY_STEP_IDS, MAX_BARS, MIN_BARS, STEP_IDS } from "../data/steps";
import { clamp } from "../util/math";
import type { Circle, Scene } from "./types";

const KEY = "raasMandal.scene.v1";
export const MAX_CIRCLES = 5;

export function defaultScene(): Scene {
  return {
    night: tonight(),
    print: "bandhani",
    circles: [
      { arrangement: "women", direction: "ccw" },
      { arrangement: "alternate", direction: "cw" },
      { arrangement: "men", direction: "ccw" },
    ],
    centre: "garbo",
    betweenDecor: [],
    sequence: DEFAULT_SEQUENCE.map((s) => ({ ...s })),
    choreography: "manual",
    songId: null,
  };
}

const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T =>
  list.includes(v as T) ? (v as T) : fallback;

function validCircle(c: unknown): c is Circle {
  if (!c || typeof c !== "object") return false;
  const { arrangement, direction } = c as Record<string, unknown>;
  return ["women", "men", "alternate"].includes(arrangement as string) && ["cw", "ccw"].includes(direction as string);
}

/** Merge saved settings over the defaults, dropping anything malformed. */
function sanitize(raw: unknown): Scene {
  const d = defaultScene();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const circles = Array.isArray(r.circles) ? r.circles.filter(validCircle).slice(0, MAX_CIRCLES) : [];
  const sequence = Array.isArray(r.sequence)
    ? r.sequence
        .map((s) => (s && LEGACY_STEP_IDS[s.step] ? { ...s, step: LEGACY_STEP_IDS[s.step] } : s))
        .filter((s) => s && STEP_IDS.includes(s.step) && Number.isFinite(s.bars))
        .map((s) => ({ step: s.step, bars: clamp(Math.round(s.bars), MIN_BARS, MAX_BARS) }))
    : d.sequence;
  return {
    night: d.night, // always open on tonight's night
    print: oneOf(PRINT_IDS, r.print, d.print),
    circles: circles.length ? circles.map((c) => ({ arrangement: c.arrangement, direction: c.direction })) : d.circles,
    centre: oneOf(CENTRE_IDS, r.centre, d.centre),
    betweenDecor: Array.isArray(r.betweenDecor) ? r.betweenDecor.filter((x) => DECOR_IDS.includes(x)) : d.betweenDecor,
    sequence,
    choreography: r.choreography === "auto" ? "auto" : "manual",
    songId: typeof r.songId === "string" ? r.songId : null,
  };
}

function load(): Scene {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return defaultScene();
  }
}

function save(scene: Scene) {
  try {
    localStorage.setItem(KEY, JSON.stringify(scene));
  } catch {
    // Storage unavailable (private mode, quota): settings just won't persist.
  }
}

export interface Store {
  get(): Readonly<Scene>;
  /** Apply a change to a draft copy, then persist and notify. */
  update(change: (draft: Scene) => void): void;
  /** Call `fn` now and whenever the selected slice of the scene changes. */
  watch<T>(select: (scene: Scene) => T, fn: (value: T, scene: Scene) => void): () => void;
}

export function createStore(): Store {
  let scene = load();
  const listeners = new Set<(scene: Scene) => void>();

  return {
    get: () => scene,
    update(change) {
      const draft = structuredClone(scene);
      change(draft);
      scene = draft;
      save(scene);
      listeners.forEach((l) => l(scene));
    },
    watch(select, fn) {
      let last = JSON.stringify(select(scene));
      fn(select(scene), scene);
      const listener = (s: Scene) => {
        const value = select(s);
        const key = JSON.stringify(value);
        if (key === last) return;
        last = key;
        fn(value, s);
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
