import { themeFor } from "../data/nights";
import { PRINT_IDS } from "../data/prints";
import { TILES, printColours } from "../stage/patterns";
import type { Store } from "../state/store";
import type { NightTheme } from "../data/nights";
import type { PrintId } from "../state/types";
import { el, rebuild, section } from "./dom";
import { t, watchLocalized } from "./i18n";

/** Swatch tile size in CSS px: larger than on dancers so the motif is easy to read. */
const SWATCH_TILE = 26;

function paintSwatch(canvas: HTMLCanvasElement, print: PrintId, theme: NightTheme) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || 80, h = canvas.clientHeight || 40;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const g = canvas.getContext("2d");
  if (!g) return;
  const pattern = g.createPattern(TILES[print](printColours(theme.wear, theme), Math.round(SWATCH_TILE * dpr)), "repeat");
  g.fillStyle = pattern ?? theme.wear;
  g.fillRect(0, 0, canvas.width, canvas.height);
}

export function mountPrints(panel: HTMLElement, store: Store) {
  const sec = section((s) => s.printTitle);
  const grid = el("div", { class: "prints", role: "group" });
  const info = el("p", { class: "note" });
  sec.append(grid, info);
  panel.append(sec);

  watchLocalized(
    store,
    (s) => [s.night, s.print] as const,
    ([night, current]) => {
      const theme = themeFor(night);
      const s = t();
      grid.setAttribute("aria-label", s.printGroupAria);
      rebuild(grid, () => {
        for (const id of PRINT_IDS) {
          const b = el(
            "button",
            { class: "print", type: "button", "aria-pressed": String(id === current), "data-focus": `print-${id}` },
            `<canvas aria-hidden="true"></canvas><span class="nm">${s.prints[id].name}</span>`,
          );
          b.onclick = () => store.update((d) => { d.print = id; });
          grid.append(b);
        }
      });
      // Paint after layout so the canvases know their size.
      grid.querySelectorAll("canvas").forEach((c, i) => paintSwatch(c, PRINT_IDS[i], theme));
      info.textContent = s.prints[current].about;
    },
  );
}
