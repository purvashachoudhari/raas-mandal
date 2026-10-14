import { CENTRE_IDS, DECOR_IDS } from "../data/festive";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";
import { localized, t, watchLocalized } from "./i18n";

/** Festive elements (§5.6): one centrepiece, plus any number of decorations between the circles. */
export function mountCentre(panel: HTMLElement, store: Store) {
  const sec = section((s) => s.festiveTitle);
  const grid = el("div", { class: "centres", role: "group" });
  const decor = el("div", { class: "decors", role: "group" });
  const decorNote = el("p", { class: "note" });
  const centreHead = el("h3", { class: "sub-h" });
  const decorHead = el("h3", { class: "sub-h" });
  sec.append(centreHead, grid, decorHead, decor, decorNote);
  panel.append(sec);

  localized(() => {
    const s = t();
    centreHead.textContent = s.inCentre;
    decorHead.textContent = s.betweenCircles;
    grid.setAttribute("aria-label", s.centreAria);
    decor.setAttribute("aria-label", s.betweenCircles);
  });

  watchLocalized(
    store,
    (s) => s.centre,
    (current) => {
      rebuild(grid, () => {
        for (const id of CENTRE_IDS) {
          const b = el(
            "button",
            { class: "centre", type: "button", "aria-pressed": String(id === current), "data-focus": `centre-${id}` },
            `<span class="nm">${t().centres[id]}</span>`,
          );
          b.onclick = () => store.update((d) => { d.centre = id; });
          grid.append(b);
        }
      });
    },
  );

  watchLocalized(
    store,
    (s) => s.betweenDecor,
    (on) => {
      rebuild(decor, () => {
        for (const id of DECOR_IDS) {
          const pressed = on.includes(id);
          const b = el(
            "button",
            { class: "centre decor", type: "button", "aria-pressed": String(pressed), "data-focus": `decor-${id}` },
            `<span class="nm">${t().decors[id]}</span>`,
          );
          b.onclick = () =>
            store.update((s) => {
              // Keep the canonical order so lanes are assigned the same way whatever the click order.
              const next = pressed ? s.betweenDecor.filter((x) => x !== id) : [...s.betweenDecor, id];
              s.betweenDecor = DECOR_IDS.filter((x) => next.includes(x));
            });
          decor.append(b);
        }
      });
      decorNote.textContent = on.length ? t().decorOnNote : t().decorOffNote;
    },
  );
}
