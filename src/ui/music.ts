import { NUDGE_MS, TAPS_NEEDED } from "../analysis/corrections";
import { formatTime, type Library, type Song } from "../audio/library";
import type { Playback } from "../audio/player";
import { LOW_CONFIDENCE, type SongSession } from "../audio/session";
import { MIN_TAPS } from "../audio/tapSync";
import { parseYouTubeId } from "../audio/youtube";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";

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
  if (song.state === "loading") return "Loading…";
  if (song.kind === "youtube") {
    if (song.state === "error") return "Can't play here";
    return song.syncedBpm ? `Synced · ${song.syncedBpm} bpm` : "Not synced yet";
  }
  if (song.state === "error") return "Couldn't play this file";
  const a = song.analysis;
  if (a.state === "analysing") return `Analysing ${Math.round(a.progress * 100)}%`;
  if (a.state === "ready") return `Ready · ${a.bpm} bpm`;
  if (a.state === "error") return "Couldn't analyse";
  return "Not analysed";
}

const signedMs = (ms: number) => (ms > 0 ? `+${ms} ms` : ms < 0 ? `−${-ms} ms` : "0 ms");

export function mountMusic(panel: HTMLElement, store: Store, library: Library, player: Playback, session: SongSession): MusicPanel {
  const sec = section("સંગીત", "Music");

  // Add a YouTube song by link (any YouTube URL format, or a bare video ID).
  const ytForm = el(
    "form",
    { class: "yt-add" },
    `<label class="sr-only" for="ytLink">YouTube link</label>
     <input id="ytLink" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="Paste a YouTube link">
     <button type="submit" class="ghost">Add YouTube link</button>`,
  );
  const ytInput = ytForm.querySelector("input")!;
  ytForm.onsubmit = (e) => {
    e.preventDefault();
    const id = parseYouTubeId(ytInput.value);
    if (!id) {
      showMessage(ytInput.value.trim()
        ? "That doesn't look like a YouTube link. Copy the video's address (for example https://www.youtube.com/watch?v=… or https://youtu.be/…) and paste it here."
        : "Paste a YouTube link first.");
      return;
    }
    showMessage("");
    ytInput.value = "";
    const song = library.addYouTube(id);
    store.update((d) => { d.songId = song.id; });
  };

  const input = el("input", { type: "file", accept: "audio/*,.mp3,.m4a,.wav,.ogg", multiple: "", hidden: "" });
  const drop = el("div", { class: "drop" }, `<span>Drop songs here, or</span> <button type="button" class="ghost">Choose files</button>`);
  drop.append(input);
  drop.querySelector("button")!.onclick = () => input.click();
  input.onchange = () => {
    if (input.files) addFiles(input.files);
    input.value = "";
  };

  const msg = el("p", { class: "msg", role: "status" });
  const songError = el("p", { class: "msg err", role: "alert" });
  const list = el("ul", { class: "songs", "aria-label": "Songs" });
  const note = el("p", { class: "note" });

  // Preview controls for the selected song.
  const preview = el(
    "div",
    { class: "preview", hidden: "" },
    `<button type="button" class="icon-btn small" aria-label="Play preview">${PLAY}</button>
     <span class="time" data-t="now">0:00</span>
     <input type="range" min="0" max="1" step="0.1" value="0" aria-label="Song position">
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
    `<p class="warn" role="status" hidden>Beat detection is unsure. Tap to correct.</p>
     <div class="fix-row"><span class="lbl">Beat timing</span>
       <button type="button" class="mini" data-a="earlier" aria-label="Move beats ${NUDGE_MS} ms earlier">−${NUDGE_MS} ms</button>
       <output data-o="offset">0 ms</output>
       <button type="button" class="mini" data-a="later" aria-label="Move beats ${NUDGE_MS} ms later">+${NUDGE_MS} ms</button></div>
     <div class="fix-row"><span class="lbl">Tempo</span>
       <button type="button" class="mini" data-a="half" aria-label="Halve the tempo">½×</button>
       <output data-o="bpm">– bpm</output>
       <button type="button" class="mini" data-a="double" aria-label="Double the tempo">2×</button></div>
     <div class="fix-row">
       <button type="button" class="ghost tap" data-a="tap">Tap to correct</button>
       <button type="button" class="mini" data-a="reset">Reset</button></div>
     <p class="note" data-o="hint"></p>`,
  );
  const warn = fix.querySelector<HTMLElement>(".warn")!;
  const offsetOut = fix.querySelector<HTMLElement>('[data-o="offset"]')!;
  const bpmOut = fix.querySelector<HTMLElement>('[data-o="bpm"]')!;
  const hint = fix.querySelector<HTMLElement>('[data-o="hint"]')!;
  const fixBtn = (a: string) => fix.querySelector<HTMLButtonElement>(`[data-a="${a}"]`)!;
  let hintText = "";
  fixBtn("earlier").onclick = () => session.nudge(-NUDGE_MS);
  fixBtn("later").onclick = () => session.nudge(NUDGE_MS);
  fixBtn("half").onclick = () => session.halve();
  fixBtn("double").onclick = () => session.double();
  fixBtn("reset").onclick = () => { hintText = ""; session.resetCorrections(); };
  function tap() {
    const r = session.tap();
    const yt = session.source === "youtube";
    hintText =
      r === "need-playing" ? "Play the song first, then tap on every beat."
      : r === "applied" ? (yt ? "Synced to your taps. Keep tapping to refine, or nudge below." : "Beats re-fitted to your taps.")
      : "";
    renderFix();
  }
  fixBtn("tap").onclick = tap;

  function renderFix() {
    songError.textContent = session.error ?? "";
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
    fixBtn("tap").textContent = n ? `Tap ${n} / ${TAPS_NEEDED}` : "Tap to correct";
    hint.textContent = n ? "Keep tapping on every beat…" : hintText || `Tap ${TAPS_NEEDED} beats while the song plays to re-fit the beat.`;
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
    fixBtn("tap").textContent = n && n < MIN_TAPS ? `Tap beat · ${n} / ${MIN_TAPS}` : "Tap beat";
    hint.textContent =
      n && n < MIN_TAPS ? "Keep tapping on every beat…"
      : hintText || (sync
        ? `Synced at ${Math.round(sync.bpm)} bpm. Tap again any time to refine, or nudge.`
        : `Not synced yet: dancers keep a steady 120 bpm. Play the song, then tap on every beat (button or T key), starting on beat 1 of a bar. After ${MIN_TAPS} taps they lock on.`);
  }
  session.subscribe(renderFix);
  player.subscribe(renderFix);

  // Now playing: one fixed spot for the selected YouTube song. main.ts places the player screen over
  // the slot (the iframe itself never moves in the page, or it would reload).
  const nowPlaying = el(
    "div",
    { class: "now-playing", hidden: "" },
    `<span class="lbl">Now playing</span><span class="np-title"></span><div class="yt-slot" id="ytSlot" aria-hidden="true"></div>`,
  );
  const npTitle = nowPlaying.querySelector<HTMLElement>(".np-title")!;

  sec.append(drop, ytForm, msg, nowPlaying, list, songError, preview, fix, note);
  panel.append(sec);

  function showMessage(text: string) {
    msg.textContent = text;
    msg.hidden = !text;
  }
  showMessage("");

  function addFiles(files: Iterable<File>) {
    const all = [...files];
    const added = library.addFiles(all);
    if (!added.length) {
      showMessage(all.length ? "Those files aren't audio. Use .mp3, .m4a, .wav or .ogg." : "");
      return;
    }
    showMessage(added.length === all.length ? "" : `Added ${added.length} of ${all.length} files; the rest weren't audio.`);
    store.update((d) => { d.songId = added[0].id; });
  }

  function render() {
    const current = store.get().songId;
    const songs = library.songs();
    rebuild(list, () => {
      for (const song of songs) {
        const meta = [song.artist, formatTime(song.duration), statusText(song)].filter(Boolean).join(" · ");
        const b = el(
          "button",
          { type: "button", class: `song${song.state === "error" ? " err" : ""}`, "aria-pressed": String(song.id === current), "data-focus": `song-${song.id}` },
          `<span class="t"><span class="badge ${song.kind}">${song.kind === "youtube" ? "YouTube" : "File"}</span><span class="tt"></span></span><span class="s"></span>`,
        );
        // Titles come from file tags, file names and YouTube: set as text, never HTML.
        b.querySelector(".tt")!.textContent = song.title;
        b.querySelector(".s")!.textContent = song.origin === "added" || song.origin === "link" ? `${meta} · added` : meta;
        b.onclick = () => store.update((d) => { d.songId = song.id; });
        const li = el("li");
        li.append(b);
        if (song.origin === "link") {
          const rm = el("button", { type: "button", class: "song-rm", "aria-label": `Remove ${song.title}`, title: "Remove this link", "data-focus": `rm-${song.id}` }, "×");
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

    if (!songs.length) {
      note.innerHTML = library.hasManifest
        ? "The <code>music/</code> folder has no songs yet. Add files there and run <code>npm run music</code>, or drop songs above."
        : "Drop your own songs above. When running locally, <code>npm run music</code> lists the songs in <code>music/</code>.";
    } else {
      note.textContent = "Song files are analysed once for their beats and the result is saved; files you drop in stay until you reload. YouTube songs are synced by tapping along, and the sync is saved for each video.";
    }

    const song = library.find(current);
    nowPlaying.hidden = !song || song.kind !== "youtube" || song.state === "error";
    if (song) npTitle.textContent = song.title;
    preview.hidden = !song || song.state === "error";
    previewBtn.innerHTML = player.playing ? PAUSE : PLAY;
    previewBtn.setAttribute("aria-label", player.playing ? "Pause preview" : "Play preview");
    previewBtn.disabled = !player.loaded && !player.loading;
    scrub.disabled = !player.loaded;
  }

  library.subscribe(render);
  player.subscribe(render);
  store.watch((s) => s.songId, render);

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
