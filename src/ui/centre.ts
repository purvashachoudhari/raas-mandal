import { CENTRES, DECORS } from "../data/festive";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";

/** Festive elements (§5.6): one centrepiece, plus any number of decorations between the circles. */
export function mountCentre(panel: HTMLElement, store: Store) {
  const sec = section("શણગાર", "Festive");
  const grid = el("div", { class: "centres", role: "group", "aria-label": "Centrepiece" });
  const decor = el("div", { class: "decors", role: "group", "aria-label": "Between the circles" });
  const decorNote = el("p", { class: "note" });
  sec.append(el("h3", { class: "sub-h" }, "In the centre"), grid, el("h3", { class: "sub-h" }, "Between the circles"), decor, decorNote);
  panel.append(sec);

  store.watch(
    (s) => s.centre,
    (current) => {
      rebuild(grid, () => {
        for (const c of CENTRES) {
          const b = el(
            "button",
            { class: "centre", type: "button", "aria-pressed": String(c.id === current), "data-focus": `centre-${c.id}` },
            `<span class="gu">${c.gu}</span><span class="en">${c.en}</span>`,
          );
          b.onclick = () => store.update((d) => { d.centre = c.id; });
          grid.append(b);
        }
      });
    },
  );

  store.watch(
    (s) => s.betweenDecor,
    (on) => {
      rebuild(decor, () => {
        for (const d of DECORS) {
          const pressed = on.includes(d.id);
          const b = el(
            "button",
            { class: "centre decor", type: "button", "aria-pressed": String(pressed), "data-focus": `decor-${d.id}` },
            `<span class="gu">${d.gu}</span><span class="en">${d.en}</span>`,
          );
          b.onclick = () =>
            store.update((s) => {
              // Keep the canonical order so lanes are assigned the same way whatever the click order.
              const next = pressed ? s.betweenDecor.filter((x) => x !== d.id) : [...s.betweenDecor, d.id];
              s.betweenDecor = DECORS.map((x) => x.id).filter((id) => next.includes(id));
            });
          decor.append(b);
        }
      });
      decorNote.textContent = on.length
        ? "Decorations sit in their own lanes between the circles, so the dancers get a little smaller to make room."
        : "Turn on any to decorate the gaps between the circles.";
    },
  );
}
