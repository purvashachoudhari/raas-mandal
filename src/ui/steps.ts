import { MAX_BARS, STEPS, STEP_IDS, barStep } from "../data/steps";
import type { Store } from "../state/store";
import type { SequenceItem } from "../state/types";
import { el, rebuild, section } from "./dom";
import { localized, t, watchLocalized } from "./i18n";

export interface StepsPanel {
  /** Highlight the sequence item currently dancing (−1 for none). */
  setCurrent(index: number): void;
}

/** Move one item of a list to another index. */
function moveItem<T>(list: T[], from: number, to: number) {
  const [item] = list.splice(from, 1);
  list.splice(to, 0, item);
}

export function mountSteps(panel: HTMLElement, store: Store): StepsPanel {
  const sec = section((s) => s.stepsTitle);
  const editor = el("div", { class: "steps-editor" });

  // Library: dance steps and whole-circle formations, both adding into the same sequence.
  const lib = el("div", { class: "lib-groups" });
  const list = el("ol", { class: "seq" });
  // Announces keyboard moves to screen readers.
  const live = el("p", { class: "sr-only", "aria-live": "polite" });
  editor.append(lib, list, live);
  sec.append(editor);
  panel.append(sec);

  localized(() => {
    const s = t();
    live.textContent = ""; // an announcement from before the switch is in the old language
    list.setAttribute("aria-label", s.sequenceAria);
    rebuild(lib, () => {
      for (const [group, title] of [["step", s.stepGroup], ["formation", s.formationGroup]] as const) {
        const row = el("div", { class: "lib", role: "group", "aria-label": s.addFromAria(title) });
        for (const id of STEP_IDS.filter((i) => STEPS[i].group === group)) {
          const st = s.steps[id];
          const b = el("button", { type: "button", title: s.addStepTitle(st.name, st.feel), "data-focus": `add-${id}` }, `+ <span class="main">${st.name}</span>`);
          b.onclick = () => store.update((d) => { d.sequence.push({ step: id, bars: STEPS[id].defaultBars }); });
          row.append(b);
        }
        lib.append(el("h3", { class: "sub-h" }, title), row);
      }
    });
  });

  let current = -1;

  /** A step's name and feel. */
  const nameHtml = (item: SequenceItem) => {
    const st = t().steps[item.step];
    return `<span class="nm"><span class="main">${st.name}</span><br><span class="sub">${st.feel}</span></span>`;
  };

  const edit = (change: (seq: SequenceItem[]) => void) => store.update((d) => change(d.sequence));

  /** Move a step, keeping keyboard focus on its handle and announcing where it went. */
  function move(from: number, to: number) {
    const seq = store.get().sequence;
    if (to < 0 || to >= seq.length || to === from) return;
    const name = t().steps[seq[from].step].name;
    edit((s) => moveItem(s, from, to));
    list.querySelector<HTMLElement>(`[data-focus="handle-${to}"]`)?.focus();
    live.textContent = t().movedTo(name, to + 1, seq.length);
  }

  watchLocalized(
    store,
    (s) => s.sequence,
    (seq) => {
      const s = t();
      rebuild(list, () => {
        if (!seq.length) {
          list.append(el("li", { class: "empty" }, s.noSteps));
          return;
        }
        seq.forEach((item, i) => {
          const name = s.steps[item.step].name;
          const li = el(
            "li",
            {},
            `<button type="button" class="handle" data-a="handle" data-focus="handle-${i}" aria-label="${s.reorderStep(name)}" title="${s.reorderHint}">⋮⋮</button>
             <span class="n">${i + 1}</span>
             ${nameHtml(item)}
             <span class="bars">
               <button type="button" data-a="less" data-focus="less-${i}" aria-label="${s.shorter}" ${item.bars <= barStep(item.step) ? "disabled" : ""}>−</button>
               <span>${s.bars(item.bars)}</span>
               <button type="button" data-a="more" data-focus="more-${i}" aria-label="${s.longer}" ${item.bars + barStep(item.step) > MAX_BARS ? "disabled" : ""}>+</button>
             </span>
             <button type="button" class="del" data-a="del" data-focus="del-${i}" aria-label="${s.removeStep(name)}">×</button>`,
          );
          li.onclick = (e) => {
            const a = (e.target as HTMLElement).closest("button")?.dataset.a;
            if (!a || a === "handle") return;
            edit((s) => {
              // Formations change length in whole repeats (Into the centre & out is 2 bars long).
              const unit = barStep(s[i].step);
              if (a === "less") s[i].bars = Math.max(unit, s[i].bars - unit);
              if (a === "more" && s[i].bars + unit <= MAX_BARS) s[i].bars += unit;
              if (a === "del") s.splice(i, 1);
            });
          };
          // Keyboard reordering from anywhere in the row: Alt+↑ / Alt+↓.
          li.onkeydown = (e) => {
            if (!e.altKey || e.metaKey || e.ctrlKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
            e.preventDefault();
            move(i, e.key === "ArrowUp" ? i - 1 : i + 1);
          };
          li.querySelector<HTMLElement>(".handle")!.onpointerdown = (e) => startDrag(e, li, i);
          list.append(li);
        });
      });
      current = -1;
    },
  );

  // ---- Drag and drop: drag a row by its handle. It stays in place, dimmed, and a line shows where it will land. ----
  const dropLine = el("div", { class: "drop-line", "aria-hidden": "true" });

  function startDrag(e: PointerEvent, row: HTMLElement, from: number) {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture(e.pointerId);
    handle.focus({ preventScroll: true });
    const rows = [...list.children] as HTMLElement[];
    let to = from;
    row.classList.add("dragging");
    list.classList.add("reordering");
    list.append(dropLine);

    function onMove(ev: PointerEvent) {
      // The drop index counts the other rows whose middle is above the pointer.
      const others = rows.filter((r) => r !== row);
      to = others.filter((r) => {
        const b = r.getBoundingClientRect();
        return b.top + b.height / 2 < ev.clientY;
      }).length;
      // Line in the gap before the row it would land above, or after the last row.
      const listTop = list.getBoundingClientRect().top;
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      const y = to < others.length
        ? others[to].getBoundingClientRect().top - listTop - gap / 2
        : others[others.length - 1].getBoundingClientRect().bottom - listTop + gap / 2;
      dropLine.style.top = `${y}px`;
      dropLine.hidden = to === from;
    }

    function finish(commit: boolean) {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      row.classList.remove("dragging");
      list.classList.remove("reordering");
      dropLine.remove();
      if (commit && to !== from) move(from, to);
    }
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    // Esc cancels the drag (and doesn't leave Play mode or anything else).
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Escape") return;
      ev.stopPropagation();
      finish(false);
    };

    dropLine.hidden = true;
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
  }

  return {
    setCurrent(index) {
      if (index === current) return;
      current = index;
      [...list.children].forEach((li, i) => li.classList.toggle("now", i === index));
    },
  };
}
