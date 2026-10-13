import type { Store } from "../state/store";
import type { Gender } from "../state/types";
import { circleLabel, el, rebuild, section, segmented } from "./dom";

const OPTIONS: { value: Gender; html: string }[] = [
  { value: "women", html: "Women" },
  { value: "men", html: "Men" },
  { value: "alternate", html: "Alternate" },
];

export function mountArrangement(panel: HTMLElement, store: Store) {
  const sec = section("ગોઠવણ", "Arrangement");
  const rows = el("div", { class: "circle-rows" });
  sec.append(rows);
  panel.append(sec);

  store.watch(
    (s) => s.circles.map((c) => c.arrangement),
    (list) => {
      rebuild(rows, () => {
        list.forEach((g, i) => {
          const label = circleLabel(i, list.length);
          const row = el("div", { class: "circle-row" }, `<span class="lbl">${label}</span>`);
          row.append(
            segmented(OPTIONS, g, `arr-${i}`, (v) => store.update((d) => { d.circles[i].arrangement = v; }), `${label} circle dancers`, true),
          );
          rows.append(row);
        });
        if (list.length > 1) {
          const same = list.every((g) => g === list[0]) ? list[0] : null;
          const row = el("div", { class: "circle-row set-all" }, `<span class="lbl">Set all</span>`);
          row.append(
            segmented(OPTIONS, same, "arr-all", (v) => store.update((d) => d.circles.forEach((c) => { c.arrangement = v; })), "Set dancers for all circles", true),
          );
          rows.append(row);
        }
      });
    },
  );
}
