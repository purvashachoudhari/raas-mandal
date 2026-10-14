import { STRINGS, type Lang, type Strings } from "../data/strings";
import type { Store } from "../state/store";
import type { Scene } from "../state/types";

// The UI language (EN | ગુ in the header). English is the default; the choice is kept in localStorage.
// Switching re-renders the text in place, so a playing song and the dance carry on.

const KEY = "raasMandal.lang.v1";

function load(): Lang {
  try {
    return localStorage.getItem(KEY) === "gu" ? "gu" : "en";
  } catch {
    return "en";
  }
}

let lang: Lang = load();
const listeners = new Set<() => void>();
document.documentElement.lang = lang;

/** The current language's strings. Read it at render time, never cache it. */
export const t = (): Strings => STRINGS[lang];

export const getLang = (): Lang => lang;

export function setLang(next: Lang) {
  if (next === lang) return;
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // Storage unavailable: the choice just won't persist.
  }
  listeners.forEach((l) => l());
}

/** Call `fn` now and whenever the language changes. */
export function localized(fn: () => void) {
  fn();
  listeners.add(fn);
}

/** Like store.watch, but also re-runs when the language changes. */
export function watchLocalized<T>(store: Store, select: (scene: Scene) => T, fn: (value: T, scene: Scene) => void) {
  store.watch(select, fn);
  listeners.add(() => fn(select(store.get()), store.get()));
}
