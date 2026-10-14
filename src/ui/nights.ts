import { NIGHTS } from "../data/nights";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";
import { t, watchLocalized } from "./i18n";

export function mountNights(panel: HTMLElement, store: Store) {
  const sec = section((s) => s.nightTitle);
  const days = el("div", { class: "days", role: "group" });
  const info = el("p", { class: "day-info" });
  sec.append(days, info);
  panel.append(sec);

  watchLocalized(
    store,
    (s) => s.night,
    (current) => {
      const s = t();
      days.setAttribute("aria-label", s.nightGroupAria);
      rebuild(days, () => {
        for (const n of NIGHTS) {
          const label = s.nightLabel(n.n, s.nights[n.n].name);
          const b = el(
            "button",
            { class: "day", type: "button", "aria-pressed": String(n.n === current), "aria-label": label, title: label, "data-focus": `night-${n.n}` },
            `<span class="sw" style="background:${n.wear}"></span>${n.n}`,
          );
          b.onclick = () => store.update((d) => { d.night = n.n; });
          days.append(b);
        }
      });
      const night = s.nights[current];
      info.innerHTML = s.nightInfo(current, night.name, night.devi, night.date);
    },
  );
}
