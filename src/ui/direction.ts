import type { Store } from "../state/store";
import type { Direction } from "../state/types";
import { circleLabel, el, rebuild, section, segmented } from "./dom";
import { t, watchLocalized } from "./i18n";

const ACW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 109-3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12.5 1.5v4h-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
const CW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 11-9-3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.5 1.5v4h4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';

const options = (): { value: Direction; html: string }[] => [
  { value: "ccw", html: `${ACW}${t().anticlockwise}` },
  { value: "cw", html: `${CW}${t().clockwise}` },
];

export function mountDirection(panel: HTMLElement, store: Store) {
  const sec = section((s) => s.directionTitle);
  const rows = el("div", { class: "circle-rows" });
  sec.append(rows);
  panel.append(sec);

  watchLocalized(
    store,
    (s) => s.circles.map((c) => c.direction),
    (dirs) => {
      const s = t();
      const opts = options();
      rebuild(rows, () => {
        dirs.forEach((dir, i) => {
          const label = circleLabel(i, dirs.length);
          const row = el("div", { class: "circle-row" }, `<span class="lbl">${label}</span>`);
          row.append(
            segmented(opts, dir, `dir-${i}`, (v) => store.update((d) => { d.circles[i].direction = v; }), s.directionAria(label), true),
          );
          rows.append(row);
        });
        if (dirs.length > 1) {
          const same = dirs.every((d) => d === dirs[0]) ? dirs[0] : null;
          const row = el("div", { class: "circle-row set-all" }, `<span class="lbl">${s.setAll}</span>`);
          row.append(
            segmented(opts, same, "dir-all", (v) => store.update((d) => d.circles.forEach((c) => { c.direction = v; })), s.directionAllAria, true),
          );
          rows.append(row);
        }
      });
    },
  );
}
