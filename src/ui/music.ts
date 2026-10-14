import { NUDGE_MS, TAPS_NEEDED } from "../analysis/corrections";
import { formatTime, type Library, type Song } from "../audio/library";
import type { Playback } from "../audio/player";
import { LOW_CONFIDENCE, type SongSession } from "../audio/session";
import { MIN_TAPS } from "../audio/tapSync";
import { parseYouTubeId } from "../audio/youtube";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";
import type { Strings } from "../data/strings";
import { localized, t } from "./i18n";

export interface MusicPanel {
  /** Add files from the picker or a drop anywhere on the page; selects the first one added. */
  addFiles(files: Iterable<File>): void;
  /** Per-frame update of the preview position. */
  tick(): void;
  /** Tap the beat (button or T key): tap-to-sync for YouTube, tap to correct for analysed files. */
  tap(): void;
}

const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor"/></svg>';

function statusText(song: Song): string {
  const st = t().status;
  if (song.state === "loading") return st.loading;
  if (song.kind === "youtube") {
    if (song.state === "error") return st.cantPlayHere;
    return song.syncedBpm ? st.synced(song.syncedBpm) : st.notSynced;
  }
  if (song.state === "error") return st.fileFailed;
  const a = song.analysis;
  if (a.state === "analysing") return st.analysing(Math.round(a.progress * 100));
  if (a.state === "ready") return st.ready(a.bpm ?? 0);
  if (a.state === "error") return st.analyseFailed;
  return st.notAnalysed;
}

const signedMs = (ms: number) => (ms > 0 ? `+${ms} ms` : ms < 0 ? `−${-ms} ms` : "0 ms");

export function mountMusic(panel: HTMLElement, store: Store, library: Library, player: Playback, session: SongSession): MusicPanel {
  const sec = section((s) => s.musicTitle);

  // Add a YouTube song by link (any YouTube URL format, or a bare video ID).
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

  const input = el("input", { type: "file", accept: "audio/*,.mp3,.m4a,.wav,.ogg", multiple: "", hidden: "" });
  const drop = el("div", { class: "drop" }, `<span></span> <button type="button" class="ghost"></button>`);
  drop.append(input);
  drop.querySelector("button")!.onclick = () => input.click();
  input.onchange = () => {
    if (input.files) addFiles(input.files);
    input.value = "";
  };

  const msg = el("p", { class: "msg", role: "status" });
  const songError = el("p", { class: "msg err", role: "alert" });
  const list = el("ul", { class: "songs" });
  const note = el("p", { class: "note" });

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

  // Manual beat corrections (optional): nudge, half/double tempo, tap to correct.
  const fix = el(
    "div",
    { class: "beatfix", hidden: "" },
    `<p class="warn" role="status" hidden></p>
     <div class="fix-row"><span class="lbl" data-l="timing"></span>
       <button type="button" class="mini" data-a="earlier">−${NUDGE_MS} ms</button>
       <output data-o="offset">0 ms</output>
       <button type="button" class="mini" data-a="later">+${NUDGE_MS} ms</button></div>
     <div class="fix-row"><span class="lbl" data-l="tempo"></span>
       <button type="button" class="mini" data-a="half">½×</button>
       <output data-o="bpm">– bpm</output>
       <button type="button" class="mini" data-a="double">2×</button></div>
     <div class="fix-row">
       <button type="button" class="ghost tap" data-a="tap"></button>
       <button type="button" class="mini" data-a="reset"></button></div>
     <p class="note" data-o="hint"></p>`,
  );
  const warn = fix.querySelector<HTMLElement>(".warn")!;
  const offsetOut = fix.querySelector<HTMLElement>('[data-o="offset"]')!;
  const bpmOut = fix.querySelector<HTMLElement>('[data-o="bpm"]')!;
  const hint = fix.querySelector<HTMLElement>('[data-o="hint"]')!;
  const fixBtn = (a: string) => fix.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!;
  /** Result of the last tap, shown as the hint until the next one. */
  let tapResult: "need-playing" | "applied" | null = null;
  fixBtn("earlier").onclick = () => session.nudge(-NUDGE_MS);
  fixBtn("later").onclick = () => session.nudge(NUDGE_MS);
  fixBtn("half").onclick = () => session.halve();
  fixBtn("double").onclick = () => session.double();
  fixBtn("reset").onclick = () => { tapResult = null; session.resetCorrections(); };
  function tap() {
    const r = session.tap();
    tapResult = r === "counting" ? null : r;
    renderFix();
  }
  const tapHint = () =>
    tapResult === "need-playing" ? t().needPlaying
    : tapResult === "applied" ? (session.source === "youtube" ? t().syncedToTaps : t().refitted)
    : "";
  fixBtn("tap").onclick = tap;

  function renderFix() {
    songError.textContent = session.error ? t().errors[session.error] : "";
    if (session.source === "youtube") return renderYouTubeFix();
    fixBtn("tap").classList.remove("yt");
    const map = session.map;
    const grid = session.grid();
    fix.hidden = !map || !grid;
    if (!map || !grid) return;
    const c = session.corrections;
    warn.hidden = map.confidence >= LOW_CONFIDENCE;
    offsetOut.textContent = signedMs(c.offsetMs);
    bpmOut.textContent = `${Math.round(grid.bpm)} bpm`;
    fixBtn("half").disabled = c.factor === 0.5;
    fixBtn("double").disabled = c.factor === 2;
    fixBtn("reset").disabled = c.offsetMs === 0 && c.factor === 1;
    const n = session.tapCount;
    fixBtn("tap").textContent = n ? t().tapCount(n, TAPS_NEEDED) : t().tapToCorrect;
    hint.textContent = n ? t().keepTapping : tapHint() || t().tapHint(TAPS_NEEDED);
  }

  /** YouTube: its audio can't be analysed, so the beat comes from tapping along (tap-to-sync). */
  function renderYouTubeFix() {
    fix.hidden = !!session.error;
    if (session.error) return;
    const sync = session.sync;
    warn.hidden = true;
    offsetOut.textContent = signedMs(sync?.nudgeMs ?? 0);
    bpmOut.textContent = sync ? `${Math.round(sync.bpm)} bpm` : "120 bpm";
    for (const a of ["earlier", "later", "half", "double", "reset"]) fixBtn(a).disabled = !sync;
    const n = session.tapCount;
    fixBtn("tap").classList.add("yt");
    fixBtn("tap").textContent = n && n < MIN_TAPS ? t().tapBeatCount(n, MIN_TAPS) : t().tapBeat;
    hint.textContent =
      n && n < MIN_TAPS ? t().keepTapping
      : tapHint() || (sync ? t().syncedAt(Math.round(sync.bpm)) : t().notSyncedHint(MIN_TAPS));
  }
  session.subscribe(renderFix);
  player.subscribe(renderFix);

  // Now playing: one fixed spot for the selected YouTube song. main.ts places the player screen over
  // the slot (the iframe itself never moves in the page, or it would reload).
  const nowPlaying = el(
    "div",
    { class: "now-playing", hidden: "" },
    `<span class="lbl"></span><span class="np-title"></span><div class="yt-slot" id="ytSlot" aria-hidden="true"></div>`,
  );
  const npTitle = nowPlaying.querySelector<HTMLElement>(".np-title")!;

  sec.append(drop, ytForm, msg, nowPlaying, list, songError, preview, fix, note);
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
    drop.querySelector("span")!.textContent = s.dropHere;
    drop.querySelector("button")!.textContent = s.chooseFiles;
    list.setAttribute("aria-label", s.songsAria);
    scrub.setAttribute("aria-label", s.songPosition);
    nowPlaying.querySelector(".lbl")!.textContent = s.nowPlaying;
    warn.textContent = s.beatUnsure;
    fix.querySelector('[data-l="timing"]')!.textContent = s.beatTiming;
    fix.querySelector('[data-l="tempo"]')!.textContent = s.tempo;
    fixBtn("earlier").setAttribute("aria-label", s.earlierAria(NUDGE_MS));
    fixBtn("later").setAttribute("aria-label", s.laterAria(NUDGE_MS));
    fixBtn("half").setAttribute("aria-label", s.halveAria);
    fixBtn("double").setAttribute("aria-label", s.doubleAria);
    fixBtn("reset").textContent = s.reset;
    if (message) msg.textContent = message(s);
  });

  function addFiles(files: Iterable<File>) {
    const all = [...files];
    const added = library.addFiles(all);
    if (!added.length) {
      showMessage(all.length ? (s) => s.notAudio : null);
      return;
    }
    showMessage(added.length === all.length ? null : (s) => s.someNotAudio(added.length, all.length));
    store.update((d) => { d.songId = added[0].id; });
  }

  function render() {
    const s = t();
    const current = store.get().songId;
    const songs = library.songs();
    rebuild(list, () => {
      for (const song of songs) {
        const meta = [song.artist, formatTime(song.duration), statusText(song)].filter(Boolean).join(" · ");
        const b = el(
          "button",
          { type: "button", class: `song${song.state === "error" ? " err" : ""}`, "aria-pressed": String(song.id === current), "data-focus": `song-${song.id}` },
          `<span class="t"><span class="badge ${song.kind}">${song.kind === "youtube" ? s.badgeYouTube : s.badgeFile}</span><span class="tt"></span></span><span class="s"></span>`,
        );
        // Titles come from file tags, file names and YouTube: set as text, never HTML.
        b.querySelector(".tt")!.textContent = song.title;
        b.querySelector(".s")!.textContent = song.origin === "added" || song.origin === "link" ? `${meta} · ${s.addedTag}` : meta;
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
    list.hidden = !songs.length;

    note.innerHTML = songs.length ? "" : library.hasManifest ? s.noSongsInFolder : s.noSongs;
    note.hidden = !!songs.length;

    const song = library.find(current);
    nowPlaying.hidden = !song || song.kind !== "youtube" || song.state === "error";
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
  localized(() => { render(); renderFix(); });

  return {
    addFiles,
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
