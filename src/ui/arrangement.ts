import type { Store } from "../state/store";
import type { Gender } from "../state/types";
import { circleLabel, el, rebuild, section, segmented } from "./dom";
import { t, watchLocalized } from "./i18n";

const options = (): { value: Gender; html: string }[] => [
  { value: "women", html: t().women },
  { value: "men", html: t().men },
  { value: "alternate", html: t().alternate },
];

export function mountArrangement(panel: HTMLElement, store: Store) {
  const sec = section((s) => s.arrangementTitle);
  const rows = el("div", { class: "circle-rows" });
  sec.append(rows);
  panel.append(sec);

  watchLocalized(
    store,
    (s) => s.circles.map((c) => c.arrangement),
    (list) => {
      const s = t();
      const opts = options();
      rebuild(rows, () => {
        list.forEach((g, i) => {
          const label = circleLabel(i, list.length);
          const row = el("div", { class: "circle-row" }, `<span class="lbl">${label}</span>`);
          row.append(
            segmented(opts, g, `arr-${i}`, (v) => store.update((d) => { d.circles[i].arrangement = v; }), s.arrangementAria(label), true),
          );
          rows.append(row);
        });
        if (list.length > 1) {
          const same = list.every((g) => g === list[0]) ? list[0] : null;
          const row = el("div", { class: "circle-row set-all" }, `<span class="lbl">${s.setAll}</span>`);
          row.append(
            segmented(opts, same, "arr-all", (v) => store.update((d) => d.circles.forEach((c) => { c.arrangement = v; })), s.arrangementAllAria, true),
          );
          rows.append(row);
        }
      });
    },
  );
}
