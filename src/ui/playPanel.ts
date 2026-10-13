import { formatTime } from "../audio/library";
import { STEPS } from "../data/steps";
import type { SequencePos } from "../state/sequence";
import type { SequenceItem } from "../state/types";
import { el, revealInList } from "./dom";

const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor"/></svg>';
const RESTART = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 105-5H5" stroke="currentColor" stroke-width="1.6" fill="none"/><path d="M6.5 0.5L4 3l2.5 2.5" stroke="currentColor" stroke-width="1.6" fill="none"/></svg>';

export interface PlayPanelHandlers {
  onTogglePause(): void;
  onRestart(): void;
  onExit(): void;
  onSeek(seconds: number): void;
}

export interface PlayPanelSong {
  title: string;
  time: number;
  duration: number;
}

export interface PlayPanel {
  show(): void;
  hide(): void;
  setSequence(seq: readonly SequenceItem[]): void;
  /** `waiting`: the song hasn't reached its first downbeat yet. */
  update(pos: SequencePos | null, paused: boolean, song: PlayPanelSong | null, waiting: boolean): void;
}

/** Play mode controls: a translucent panel docked on the left, overlaying the stage. */
export function mountPlayPanel(panel: HTMLElement, handlers: PlayPanelHandlers): PlayPanel {
  panel.innerHTML = `
    <div class="pp-step" aria-live="polite"></div>
    <ol class="pp-seq" aria-label="Step sequence"></ol>
    <div class="pp-song" hidden>
      <div class="pp-title"></div>
      <div class="time"><span data-t="now">0:00</span> / <span data-t="total">0:00</span></div>
      <input type="range" min="0" max="1" step="0.1" value="0" aria-label="Song position">
    </div>
    <div class="pp-ctrls">
      <button type="button" class="icon-btn" data-a="restart" aria-label="Restart" title="Restart (R)">${RESTART}</button>
      <button type="button" class="icon-btn" data-a="pause" aria-label="Pause" title="Play/pause (Space)">${PAUSE}</button>
      <button type="button" class="ghost" data-a="exit" title="Back to build (Esc)">Back to build</button>
    </div>`;
  const stepLabel = panel.querySelector<HTMLElement>(".pp-step")!;
  const seqList = panel.querySelector<HTMLElement>(".pp-seq")!;
  const songBlock = panel.querySelector<HTMLElement>(".pp-song")!;
  const titleLabel = panel.querySelector<HTMLElement>(".pp-title")!;
  const nowLabel = panel.querySelector<HTMLElement>('[data-t="now"]')!;
  const totalLabel = panel.querySelector<HTMLElement>('[data-t="total"]')!;
  const scrub = panel.querySelector<HTMLInputElement>('input[type="range"]')!;
  const pauseBtn = panel.querySelector<HTMLButtonElement>('[data-a="pause"]')!;
  panel.querySelector<HTMLButtonElement>('[data-a="restart"]')!.onclick = handlers.onRestart;
  panel.querySelector<HTMLButtonElement>('[data-a="exit"]')!.onclick = handlers.onExit;
  pauseBtn.onclick = handlers.onTogglePause;

  let scrubbing = false;
  scrub.addEventListener("pointerdown", () => { scrubbing = true; });
  scrub.addEventListener("input", () => handlers.onSeek(Number(scrub.value)));
  scrub.addEventListener("change", () => { scrubbing = false; });

  let shownStep: string | null = null;
  let shownIndex = -1;
  let shownPaused: boolean | null = null;

  return {
    show: () => { panel.hidden = false; },
    hide: () => { panel.hidden = true; },
    setSequence(seq) {
      shownIndex = -1;
      seqList.replaceChildren(
        ...seq.map((item) => {
          const st = STEPS[item.step];
          return el(
            "li",
            {},
            `<span class="nm"><span class="gu">${st.gu}</span><span class="en">${item.bars} ${item.bars === 1 ? "bar" : "bars"}</span></span><i><b></b></i>`,
          );
        }),
      );
    },
    update(pos, paused, song, waiting) {
      const key = pos?.step ?? (waiting ? "waiting" : null);
      if (key !== shownStep) {
        shownStep = key;
        const st = pos ? STEPS[pos.step] : null;
        stepLabel.innerHTML = st
          ? `<span class="gu">${st.gu}</span><span class="en">${st.en} · ${st.feel}</span>`
          : waiting ? `<span class="en">Starting on the first downbeat…</span>` : "";
      }
      const index = pos?.index ?? -1;
      if (index !== shownIndex) revealInList(seqList, seqList.children[index]);
      [...seqList.children].forEach((li, i) => {
        if (index !== shownIndex) li.classList.toggle("now", i === index);
        const fill = li.querySelector("b")!;
        const pct = !pos ? 0 : i < pos.index ? 100 : i === pos.index ? (pos.beatInStep / pos.lengthBeats) * 100 : 0;
        fill.style.width = `${pct}%`;
      });
      shownIndex = index;
      if (paused !== shownPaused) {
        shownPaused = paused;
        pauseBtn.innerHTML = paused ? PLAY : PAUSE;
        pauseBtn.setAttribute("aria-label", paused ? "Play" : "Pause");
      }
      songBlock.hidden = !song;
      if (song) {
        if (titleLabel.textContent !== song.title) titleLabel.textContent = song.title;
        scrub.max = String(song.duration || 1);
        if (!scrubbing) scrub.value = String(song.time);
        nowLabel.textContent = formatTime(song.time);
        totalLabel.textContent = formatTime(song.duration);
      }
    },
  };
}
