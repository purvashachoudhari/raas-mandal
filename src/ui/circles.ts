import { MAX_CIRCLES, type Store } from "../state/store";
import { el, section } from "./dom";

export function mountCircles(panel: HTMLElement, store: Store) {
  const sec = section("ગોળ", "Circles");
  const row = el(
    "div",
    { class: "row" },
    `<span class="grow" id="circleCountLabel">Number of circles</span>
     <span class="stepper" role="group" aria-labelledby="circleCountLabel">
       <button type="button" data-a="less" aria-label="Fewer circles">−</button>
       <output aria-live="polite"></output>
       <button type="button" data-a="more" aria-label="More circles">+</button>
     </span>`,
  );
  sec.append(row);
  panel.append(sec);

  const less = row.querySelector<HTMLButtonElement>('[data-a="less"]')!;
  const more = row.querySelector<HTMLButtonElement>('[data-a="more"]')!;
  const out = row.querySelector("output")!;

  less.onclick = () => store.update((d) => { if (d.circles.length > 1) d.circles.pop(); });
  more.onclick = () =>
    store.update((d) => {
      if (d.circles.length >= MAX_CIRCLES) return;
      const last = d.circles[d.circles.length - 1];
      // New circles alternate direction.
      d.circles.push({ arrangement: "alternate", direction: last.direction === "ccw" ? "cw" : "ccw" });
    });

  store.watch(
    (s) => s.circles.length,
    (count) => {
      out.textContent = String(count);
      less.disabled = count <= 1;
      more.disabled = count >= MAX_CIRCLES;
    },
  );
}
