import { NIGHTS, nightFor } from "../data/nights";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";

export function mountNights(panel: HTMLElement, store: Store) {
  const sec = section("નોરતું", "Night");
  const days = el("div", { class: "days", role: "group", "aria-label": "Navratri night" });
  const info = el("p", { class: "day-info" });
  sec.append(days, info);
  panel.append(sec);

  store.watch(
    (s) => s.night,
    (current) => {
      rebuild(days, () => {
        for (const n of NIGHTS) {
          const b = el(
            "button",
            { class: "day", type: "button", "aria-pressed": String(n.n === current), "aria-label": `Night ${n.n}, ${n.name}`, title: `Night ${n.n} · ${n.name}`, "data-focus": `night-${n.n}` },
            `<span class="sw" style="background:${n.wear}"></span>${n.n}`,
          );
          b.onclick = () => store.update((d) => { d.night = n.n; });
          days.append(b);
        }
      });
      const n = nightFor(current);
      info.innerHTML = `<b>Night ${n.n} · ${n.name}</b> — Maa ${n.devi}, ${n.date}`;
    },
  );
}
