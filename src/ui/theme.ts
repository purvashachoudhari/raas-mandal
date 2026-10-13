import type { NightTheme } from "../data/nights";
import { rgba } from "../util/color";

/** Theme the whole UI from the night's tokens. */
export function applyTheme(t: NightTheme) {
  const r = document.documentElement.style;
  r.setProperty("--bg", t.bg);
  r.setProperty("--bg2", t.glow);
  r.setProperty("--panel", t.panel);
  r.setProperty("--ink", t.ink);
  r.setProperty("--accent", t.accent);
  r.setProperty("--accent-ink", t.accentInk);
  r.setProperty("--muted", rgba(t.ink, 0.72));
  r.setProperty("--line", rgba(t.ink, 0.16));
  r.setProperty("--chip", rgba(t.ink, 0.08));
}
