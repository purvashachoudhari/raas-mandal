import type { Store } from "../state/store";
import type { Direction } from "../state/types";
import { circleLabel, el, rebuild, section, segmented } from "./dom";

const ACW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 109-3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M12.5 1.5v4h-4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';
const CW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8a5 5 0 11-9-3" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M3.5 1.5v4h4" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';

const OPTIONS: { value: Direction; html: string }[] = [
  { value: "ccw", html: `${ACW}Anticlockwise` },
  { value: "cw", html: `${CW}Clockwise` },
];

export function mountDirection(panel: HTMLElement, store: Store) {
  const sec = section("દિશા", "Direction");
  const rows = el("div", { class: "circle-rows" });
  sec.append(rows);
  panel.append(sec);

  store.watch(
    (s) => s.circles.map((c) => c.direction),
    (dirs) => {
      rebuild(rows, () => {
        dirs.forEach((dir, i) => {
          const label = circleLabel(i, dirs.length);
          const row = el("div", { class: "circle-row" }, `<span class="lbl">${label}</span>`);
          row.append(
            segmented(OPTIONS, dir, `dir-${i}`, (v) => store.update((d) => { d.circles[i].direction = v; }), `${label} circle direction`, true),
          );
          rows.append(row);
        });
        if (dirs.length > 1) {
          const same = dirs.every((d) => d === dirs[0]) ? dirs[0] : null;
          const row = el("div", { class: "circle-row set-all" }, `<span class="lbl">Set all</span>`);
          row.append(
            segmented(OPTIONS, same, "dir-all", (v) => store.update((d) => d.circles.forEach((c) => { c.direction = v; })), "Set direction for all circles", true),
          );
          rows.append(row);
        }
      });
    },
  );
}
