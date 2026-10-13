import { MAX_BARS, MIN_BARS, STEPS, STEP_IDS } from "../data/steps";
import type { Store } from "../state/store";
import type { SequenceItem } from "../state/types";
import { el, rebuild, revealInList, section, segmented } from "./dom";

export interface StepsPanel {
  /** Highlight the sequence item currently dancing (−1 for none), in whichever list is showing. */
  setCurrent(index: number): void;
  /** The auto choreography for the selected song, or null when there is no analysed song. */
  setAuto(plan: readonly SequenceItem[] | null): void;
}

export function mountSteps(panel: HTMLElement, store: Store): StepsPanel {
  const sec = section("સ્ટેપ્સ", "Steps");
  const modeBox = el("div");
  const manual = el("div", { class: "steps-manual" });
  const auto = el("div", { class: "steps-auto" });
  const autoNote = el("p", { class: "note" });
  const planList = el("ol", { class: "seq plan", "aria-label": "Auto choreography" });
  auto.append(autoNote, planList);
  manual.append(el("p", { class: "note" }, "Add steps in the order you want. Every circle dances the sequence together, and it loops."));

  const lib = el("div", { class: "lib", role: "group", "aria-label": "Add a step" });
  for (const id of STEP_IDS) {
    const st = STEPS[id];
    const b = el("button", { type: "button", title: `Add ${st.en} (${st.feel})` }, `+ <span class="gu">${st.gu}</span>${st.en}`);
    b.onclick = () => store.update((d) => { d.sequence.push({ step: id, bars: st.defaultBars }); });
    lib.append(b);
  }

  const list = el("ol", { class: "seq", "aria-label": "Step sequence" });
  manual.append(lib, list);
  sec.append(modeBox, auto, manual);
  panel.append(sec);

  let current = -1;
  let plan: readonly SequenceItem[] | null = null;

  /** Auto with a plan shows the plan; otherwise the manual editor (also the fallback for Auto). */
  function renderMode() {
    const isAuto = store.get().choreography === "auto";
    rebuild(modeBox, () => {
      modeBox.append(
        segmented(
          [{ value: "manual", html: "Manual" }, { value: "auto", html: "Auto" }] as const,
          isAuto ? "auto" : "manual",
          "choreo",
          (v) => store.update((d) => { d.choreography = v; }),
          "Choreography",
        ),
      );
    });
    auto.hidden = !isAuto;
    manual.hidden = isAuto && !!plan;
    autoNote.textContent = !isAuto
      ? ""
      : plan
        ? "Steps follow the song's energy: Hinch and Be Taali in calm parts, Dodhiyu and Dandiya when it builds, a Fudardi at each change."
        : "Auto picks steps from an analysed song's energy. Select a song and wait for its analysis; until then your manual sequence plays.";
    planList.hidden = !isAuto || !plan;
    current = -1;
  }

  function renderPlan() {
    planList.replaceChildren(
      ...(plan ?? []).map((item, i) => {
        const st = STEPS[item.step];
        return el(
          "li",
          {},
          `<span class="n">${i + 1}</span><span class="nm"><span class="gu">${st.gu}</span><br><span class="en">${st.en} · ${st.feel}</span></span><span class="bars"><span>${item.bars} ${item.bars === 1 ? "bar" : "bars"}</span></span>`,
        );
      }),
    );
  }

  store.watch((s) => s.choreography, renderMode);

  const edit = (change: (seq: SequenceItem[]) => void) => store.update((d) => change(d.sequence));

  store.watch(
    (s) => s.sequence,
    (seq) => {
      rebuild(list, () => {
        if (!seq.length) {
          list.append(el("li", { class: "empty" }, "No steps yet. Add one above."));
          return;
        }
        seq.forEach((item, i) => {
          const st = STEPS[item.step];
          const li = el(
            "li",
            {},
            `<span class="n">${i + 1}</span>
             <span class="nm"><span class="gu">${st.gu}</span><br><span class="en">${st.en} · ${st.feel}</span></span>
             <span class="bars">
               <button type="button" data-a="less" data-focus="less-${i}" aria-label="Shorter" ${item.bars <= MIN_BARS ? "disabled" : ""}>−</button>
               <span>${item.bars} ${item.bars === 1 ? "bar" : "bars"}</span>
               <button type="button" data-a="more" data-focus="more-${i}" aria-label="Longer" ${item.bars >= MAX_BARS ? "disabled" : ""}>+</button>
             </span>
             <span class="ops">
               <button type="button" data-a="up" data-focus="up-${i}" aria-label="Move up" ${i === 0 ? "disabled" : ""}>↑</button>
               <button type="button" data-a="down" data-focus="down-${i}" aria-label="Move down" ${i === seq.length - 1 ? "disabled" : ""}>↓</button>
               <button type="button" data-a="del" data-focus="del-${i}" aria-label="Remove ${st.en}">×</button>
             </span>`,
          );
          li.onclick = (e) => {
            const a = (e.target as HTMLElement).closest("button")?.dataset.a;
            if (!a) return;
            edit((s) => {
              if (a === "less") s[i].bars = Math.max(MIN_BARS, s[i].bars - 1);
              if (a === "more") s[i].bars = Math.min(MAX_BARS, s[i].bars + 1);
              if (a === "up" && i > 0) [s[i - 1], s[i]] = [s[i], s[i - 1]];
              if (a === "down" && i < s.length - 1) [s[i + 1], s[i]] = [s[i], s[i + 1]];
              if (a === "del") s.splice(i, 1);
            });
          };
          list.append(li);
        });
      });
      current = -1;
    },
  );

  return {
    setCurrent(index) {
      if (index === current) return;
      current = index;
      const showing = planList.hidden ? list : planList;
      [...showing.children].forEach((li, i) => li.classList.toggle("now", i === index));
      if (showing === planList) revealInList(planList, planList.children[index]);
    },
    setAuto(next) {
      plan = next && next.length ? next : null;
      renderPlan();
      renderMode();
    },
  };
}
