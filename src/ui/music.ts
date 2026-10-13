import { NUDGE_MS, TAPS_NEEDED } from "../analysis/corrections";
import { formatTime, type Library, type Song } from "../audio/library";
import type { Player } from "../audio/player";
import { LOW_CONFIDENCE, type SongSession } from "../audio/session";
import type { Store } from "../state/store";
import { el, rebuild, section } from "./dom";

export interface MusicPanel {
  /** Add files from the picker or a drop anywhere on the page; selects the first one added. */
  addFiles(files: Iterable<File>): void;
  /** Per-frame update of the preview position. */
  tick(): void;
}

const PLAY = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" fill="currentColor"/></svg>';
const PAUSE = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor"/></svg>';

function statusText(song: Song): string {
  if (song.state === "loading") return "Loading…";
  if (song.state === "error") return "Couldn't play this file";
  const a = song.analysis;
  if (a.state === "analysing") return `Analysing ${Math.round(a.progress * 100)}%`;
  if (a.state === "ready") return `Ready · ${a.bpm} bpm`;
  if (a.state === "error") return "Couldn't analyse";
  return "Not analysed";
}

const signedMs = (ms: number) => (ms > 0 ? `+${ms} ms` : ms < 0 ? `−${-ms} ms` : "0 ms");

export function mountMusic(panel: HTMLElement, store: Store, library: Library, player: Player, session: SongSession): MusicPanel {
  const sec = section("સંગીત", "Music");

  const input = el("input", { type: "file", accept: "audio/*,.mp3,.m4a,.wav,.ogg", multiple: "", hidden: "" });
  const drop = el("div", { class: "drop" }, `<span>Drop songs here, or</span> <button type="button" class="ghost">Choose files</button>`);
  drop.append(input);
  drop.querySelector("button")!.onclick = () => input.click();
  input.onchange = () => {
    if (input.files) addFiles(input.files);
    input.value = "";
  };

  const msg = el("p", { class: "msg", role: "status" });
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
  fixBtn("tap").onclick = () => {
    const r = session.tap();
    hintText =
      r === "need-playing" ? "Play the song first, then tap this button on every beat."
      : r === "applied" ? "Beats re-fitted to your taps."
      : "";
    renderFix();
  };

  function renderFix() {
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
  session.subscribe(renderFix);
  player.subscribe(renderFix);

  sec.append(drop, msg, list, preview, fix, note);
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
          `<span class="t"></span><span class="s"></span>`,
        );
        // Titles come from file tags and names: set as text, never HTML.
        b.querySelector(".t")!.textContent = song.title;
        b.querySelector(".s")!.textContent = song.origin === "added" ? `${meta} · added` : meta;
        b.onclick = () => store.update((d) => { d.songId = song.id; });
        const li = el("li");
        li.append(b);
        list.append(li);
      }
    });
    list.hidden = !songs.length;

    if (!songs.length) {
      note.innerHTML = library.hasManifest
        ? "The <code>music/</code> folder has no songs yet. Add files there and run <code>npm run music</code>, or drop songs above."
        : "Drop your own songs above. When running locally, <code>npm run music</code> lists the songs in <code>music/</code>.";
    } else {
      note.textContent = "Selecting a song analyses its beats once; the result is saved. Songs you drop in stay until you reload the page.";
    }

    const song = library.find(current);
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
