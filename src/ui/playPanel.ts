import { formatTime } from "../audio/library";
import type { SequencePos } from "../state/sequence";
import type { SequenceItem } from "../state/types";
import { el, revealInList } from "./dom";
import { localized, t } from "./i18n";

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
  update(pos: SequencePos | null, paused: boolean, song: PlayPanelSong | null): void;
}

/** Play mode controls: a translucent panel docked on the left, overlaying the stage. */
export function mountPlayPanel(panel: HTMLElement, handlers: PlayPanelHandlers): PlayPanel {
  panel.innerHTML = `
    <div class="pp-step" aria-live="polite"></div>
    <ol class="pp-seq"></ol>
    <div class="pp-song" hidden>
      <div class="pp-title"></div>
      <div class="time"><span data-t="now">0:00</span> / <span data-t="total">0:00</span></div>
      <input type="range" min="0" max="1" step="0.1" value="0">
    </div>
    <div class="pp-ctrls">
      <button type="button" class="icon-btn" data-a="restart">${RESTART}</button>
      <button type="button" class="icon-btn" data-a="pause">${PAUSE}</button>
      <button type="button" class="ghost" data-a="exit"></button>
    </div>
    <div class="pp-yt" id="ppYtSlot" aria-hidden="true" hidden></div>`;
  const stepLabel = panel.querySelector<HTMLElement>(".pp-step")!;
  const seqList = panel.querySelector<HTMLElement>(".pp-seq")!;
  const songBlock = panel.querySelector<HTMLElement>(".pp-song")!;
  const titleLabel = panel.querySelector<HTMLElement>(".pp-title")!;
  const nowLabel = panel.querySelector<HTMLElement>('[data-t="now"]')!;
  const totalLabel = panel.querySelector<HTMLElement>('[data-t="total"]')!;
  const scrub = panel.querySelector<HTMLInputElement>('input[type="range"]')!;
  const pauseBtn = panel.querySelector<HTMLButtonElement>('[data-a="pause"]')!;
  const restartBtn = panel.querySelector<HTMLButtonElement>('[data-a="restart"]')!;
  const exitBtn = panel.querySelector<HTMLButtonElement>('[data-a="exit"]')!;
  restartBtn.onclick = handlers.onRestart;
  exitBtn.onclick = handlers.onExit;
  pauseBtn.onclick = handlers.onTogglePause;

  let scrubbing = false;
  scrub.addEventListener("pointerdown", () => { scrubbing = true; });
  scrub.addEventListener("input", () => handlers.onSeek(Number(scrub.value)));
  scrub.addEventListener("change", () => { scrubbing = false; });

  let shownStep: string | null = null;
  let shownIndex = -1;
  let shownPaused: boolean | null = null;
  let sequence: readonly SequenceItem[] = [];

  function renderSequence() {
    shownIndex = -1;
    const s = t();
    seqList.replaceChildren(
      ...sequence.map((item) =>
        el("li", {}, `<span class="nm"><span class="main">${s.steps[item.step].name}</span><span class="sub">${s.bars(item.bars)}</span></span><i><b></b></i>`),
      ),
    );
  }

  localized(() => {
    const s = t();
    panel.setAttribute("aria-label", s.playControlsAria);
    seqList.setAttribute("aria-label", s.sequenceAria);
    scrub.setAttribute("aria-label", s.songPosition);
    restartBtn.setAttribute("aria-label", s.restart);
    restartBtn.title = s.restartTitle;
    pauseBtn.title = s.playPauseTitle;
    exitBtn.textContent = s.backToBuild;
    exitBtn.title = s.backToBuildTitle;
    // Re-render the step, sequence and pause label in the new language on the next update.
    shownStep = null;
    shownPaused = null;
    renderSequence();
  });

  return {
    show: () => { panel.hidden = false; },
    hide: () => { panel.hidden = true; },
    setSequence(seq) {
      sequence = seq;
      renderSequence();
    },
    update(pos, paused, song) {
      const key = pos?.step ?? null;
      if (key !== shownStep) {
        shownStep = key;
        const st = pos ? t().steps[pos.step] : null;
        stepLabel.innerHTML = st
          ? `<span class="main">${st.name}</span><span class="sub">${st.feel}</span>`
          : "";
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
        pauseBtn.setAttribute("aria-label", paused ? t().play : t().pause);
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
