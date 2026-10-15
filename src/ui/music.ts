import { PREVIEW_BPM } from "../audio/beatClock";
import { formatTime, type Library, type Song } from "../audio/library";
import type { SongSession, TapResult } from "../audio/session";
import { MAX_BPM, MIN_BPM, MIN_TAPS } from "../audio/tapSync";
import { parseYouTubeId, type YouTubePlayer } from "../audio/youtube";
import type { Strings } from "../data/strings";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";
import { localized, t } from "./i18n";

export interface MusicPanel {
  /** Per-frame update of the preview position. */
  tick(): void;
  /** Tap the beat (button or T key). */
  tap(): void;
}

const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor"/></svg>';

function statusText(song: Song): string {
  const st = t().status;
  if (song.state === "loading") return st.loading;
  if (song.state === "error") return st.cantPlayHere;
  return song.syncedBpm ? st.synced(song.syncedBpm) : st.notSynced;
}

export function mountMusic(panel: HTMLElement, store: Store, library: Library, player: YouTubePlayer, session: SongSession): MusicPanel {
  const sec = section((s) => s.musicTitle);

  // Add a song by YouTube link (any YouTube URL format, or a bare video ID).
  const ytForm = el(
    "form",
    { class: "yt-add" },
    `<label class="sr-only" for="ytLink"></label>
     <input id="ytLink" type="text" inputmode="url" autocomplete="off" spellcheck="false">
     <button type="submit" class="ghost"></button>`,
  );
  const ytInput = ytForm.querySelector("input")!;
  ytForm.onsubmit = (e) => {
    e.preventDefault();
    const id = parseYouTubeId(ytInput.value);
    if (!id) {
      showMessage(ytInput.value.trim() ? (s) => s.ytBadLink : (s) => s.ytEmpty);
      return;
    }
    showMessage(null);
    ytInput.value = "";
    const song = library.addYouTube(id);
    store.update((d) => { d.songId = song.id; });
  };

  const msg = el("p", { class: "msg", role: "status" });
  const songError = el("p", { class: "msg err", role: "alert" });
  const list = el("ul", { class: "songs" });

  // Preview controls for the selected song.
  const preview = el(
    "div",
    { class: "preview", hidden: "" },
    `<button type="button" class="icon-btn small">${PLAY}</button>
     <span class="time" data-t="now">0:00</span>
     <input type="range" min="0" max="1" step="0.1" value="0">
     <span class="time" data-t="total">0:00</span>`,
  );
  const previewBtn = preview.querySelector("button")!;
  const scrub = preview.querySelector("input")!;
  const nowLabel = preview.querySelector<HTMLElement>('[data-t="now"]')!;
  const totalLabel = preview.querySelector<HTMLElement>('[data-t="total"]')!;
  let scrubbing = false;
  previewBtn.onclick = () => player.toggle();
  scrub.addEventListener("pointerdown", () => { scrubbing = true; });
  scrub.addEventListener("input", () => player.seek(Number(scrub.value)));
  scrub.addEventListener("change", () => { scrubbing = false; });

  // Sync (§5.8): the tempo (typed), Tap beat (tempo and timing from tapping along), and Reset.
  const sync = el(
    "div",
    { class: "beatfix", hidden: "" },
    `<div class="fix-row tempo-row">
       <label class="lbl" for="bpmInput"></label>
       <input id="bpmInput" class="bpm-input" type="number" inputmode="numeric" min="${MIN_BPM}" max="${MAX_BPM}" step="1">
       <span class="unit">bpm</span></div>
     <div class="fix-row tap-row">
       <button type="button" class="tap" data-a="tap"></button>
       <button type="button" class="reset" data-a="reset"></button></div>
     <p class="sync-hint" data-o="hint"></p>`,
  );
  const bpmInput = sync.querySelector<HTMLInputElement>("#bpmInput")!;
  const tapBtn = sync.querySelector<HTMLButtonElement>('[data-a="tap"]')!;
  const resetBtn = sync.querySelector<HTMLButtonElement>('[data-a="reset"]')!;
  const hint = sync.querySelector<HTMLElement>('[data-o="hint"]')!;
  /** Result of the last tap, shown as the hint until the next change. */
  let tapResult: TapResult | null = null;

  // Typed tempo applies on Enter or when leaving the field; an empty or invalid entry just reverts.
  bpmInput.addEventListener("change", () => {
    const bpm = Number(bpmInput.value);
    if (bpmInput.value.trim() && Number.isFinite(bpm)) { tapResult = null; session.setBpm(Math.round(bpm)); }
    renderSync();
  });
  tapBtn.onclick = tap;
  resetBtn.onclick = () => { tapResult = null; session.reset(); };

  function tap() {
    tapResult = session.tap();
    renderSync();
  }

  function renderSync() {
    const s = t();
    songError.textContent = session.error ? s.errors[session.error] : "";
    sync.hidden = !session.songId || !!session.error;
    if (sync.hidden) return;
    const synced = session.sync;
    if (document.activeElement !== bpmInput) bpmInput.value = String(Math.round(synced?.bpm ?? PREVIEW_BPM));
    resetBtn.disabled = !synced;
    const n = session.tapCount;
    const counting = n > 0 && n < MIN_TAPS;
    tapBtn.textContent = counting ? s.tapBeatCount(n, MIN_TAPS) : s.tapBeat;
    hint.textContent =
      counting ? s.keepTapping
      : tapResult === "need-playing" ? s.needPlaying
      : synced ? s.syncedAt(Math.round(synced.bpm))
      : s.notSyncedHint;
  }
  session.subscribe(renderSync);
  player.subscribe(renderSync);

  // Now playing: one fixed spot for the selected song. main.ts places the YouTube player screen over
  // the slot (the iframe itself never moves in the page, or it would reload).
  const nowPlaying = el(
    "div",
    { class: "now-playing", hidden: "" },
    `<span class="lbl"></span><span class="np-title"></span><div class="yt-slot" id="ytSlot" aria-hidden="true"></div>`,
  );
  const npTitle = nowPlaying.querySelector<HTMLElement>(".np-title")!;

  // Top to bottom: add a link, the songs, then for the selected song: Now playing (title + YouTube
  // player), the play button and progress bar, and the tempo block.
  sec.append(ytForm, msg, list, songError, nowPlaying, preview, sync);
  panel.append(sec);

  // A message is kept as a function of the strings, so it switches language with everything else.
  let message: ((s: Strings) => string) | null = null;
  function showMessage(text: ((s: Strings) => string) | null) {
    message = text;
    msg.textContent = text ? text(t()) : "";
    msg.hidden = !text;
  }
  showMessage(null);

  // Text that never changes except with the language.
  localized(() => {
    const s = t();
    ytForm.querySelector("label")!.textContent = s.ytLink;
    ytInput.placeholder = s.ytPlaceholder;
    ytForm.querySelector("button")!.textContent = s.ytAdd;
    list.setAttribute("aria-label", s.songsAria);
    scrub.setAttribute("aria-label", s.songPosition);
    nowPlaying.querySelector(".lbl")!.textContent = s.nowPlaying;
    sync.querySelector("label")!.textContent = s.tempo;
    bpmInput.setAttribute("aria-label", s.tempoAria);
    resetBtn.textContent = s.reset;
    resetBtn.title = s.resetTitle;
    if (message) msg.textContent = message(s);
  });

  function render() {
    const s = t();
    const current = store.get().songId;
    rebuild(list, () => {
      for (const song of library.songs()) {
        const meta = [song.artist, formatTime(song.duration), statusText(song)].filter(Boolean).join(" · ");
        const b = el(
          "button",
          { type: "button", class: `song${song.state === "error" ? " err" : ""}`, "aria-pressed": String(song.id === current), "data-focus": `song-${song.id}` },
          `<span class="t"><span class="tt"></span></span><span class="s"></span>`,
        );
        // Titles come from the starter list and from YouTube: set as text, never HTML.
        b.querySelector(".tt")!.textContent = song.title;
        b.querySelector(".s")!.textContent = meta;
        b.onclick = () => store.update((d) => { d.songId = song.id; });
        const li = el("li");
        li.append(b);
        if (song.origin === "link") {
          const rm = el("button", { type: "button", class: "song-rm", "aria-label": s.removeSong(song.title), title: s.removeLink, "data-focus": `rm-${song.id}` }, "×");
          rm.onclick = () => {
            if (store.get().songId === song.id) store.update((d) => { d.songId = null; });
            library.removeYouTube(song.id);
          };
          li.append(rm);
        }
        list.append(li);
      }
    });

    const song = library.find(current);
    nowPlaying.hidden = !song || song.state === "error";
    if (song) npTitle.textContent = song.title;
    preview.hidden = !song || song.state === "error";
    previewBtn.innerHTML = player.playing ? PAUSE : PLAY;
    previewBtn.setAttribute("aria-label", player.playing ? s.pausePreview : s.playPreview);
    previewBtn.disabled = !player.loaded && !player.loading;
    scrub.disabled = !player.loaded;
  }

  library.subscribe(render);
  player.subscribe(render);
  store.watch((s) => s.songId, render);
  localized(() => { render(); renderSync(); });

  return {
    tap,
    tick() {
      if (preview.hidden) return;
      const d = player.duration;
      scrub.max = String(d || 1);
      if (!scrubbing) scrub.value = String(player.currentTime());
      nowLabel.textContent = formatTime(player.currentTime());
      totalLabel.textContent = formatTime(d || library.find(store.get().songId)?.duration || null);
    },
  };
}
