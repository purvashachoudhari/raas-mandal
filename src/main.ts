import "./styles/tokens.css";
import "./styles/panel.css";
import "./styles/stage.css";
import "./styles/play.css";

import { createSongClock } from "./audio/beatClock";
import { createLibrary } from "./audio/library";
import { createMedia } from "./audio/media";
import { createPlayer } from "./audio/player";
import { createYouTubePlayer } from "./audio/youtube";
import { createSongSession } from "./audio/session";
import { nightFor, themeFor } from "./data/nights";
import { STEPS } from "./data/steps";
import { autoSequence, barEnergies } from "./state/choreography";
import { sequenceAt } from "./state/sequence";
import { createStore } from "./state/store";
import type { Scene, SequenceItem } from "./state/types";
import type { Rect } from "./stage/layout";
import { createRenderer, type Motion } from "./stage/renderer";
import { mountArrangement } from "./ui/arrangement";
import { mountCentre } from "./ui/centre";
import { mountCircles } from "./ui/circles";
import { mountDirection } from "./ui/direction";
import { byId } from "./ui/dom";
import { mountMusic } from "./ui/music";
import { mountNights } from "./ui/nights";
import { mountPlayPanel } from "./ui/playPanel";
import { mountPrints } from "./ui/prints";
import { mountSteps } from "./ui/steps";
import { applyTheme } from "./ui/theme";

const store = createStore();
const library = createLibrary();
const player = createPlayer();
const youtube = createYouTubePlayer(byId("ytFrame"));
/** Both song sources behind one interface: files (Web Audio) and YouTube (IFrame player). */
const media = createMedia(player, youtube);
const session = createSongSession(library, player, youtube, media);
/** One clock: the song's playback position, mapped to its detected beats. */
const clock = createSongClock(media, () => session.grid());
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const songSelected = () => media.loaded || media.loading;

// ---------- Motion ----------
// The dancers only dance while a song plays. A started song that's paused freezes them in place;
// once it ends or is stopped (or no song is selected) they ease back to the resting pose.
let songStarted = false;
media.subscribe((e) => {
  if (e === "play") songStarted = true;
  else if (e === "ended" || e === "unload" || e === "error") songStarted = false;
});

// ---------- Panel ----------
const panel = byId("panel");
mountNights(panel, store);
mountPrints(panel, store);
mountCircles(panel, store);
mountDirection(panel, store);
mountArrangement(panel, store);
mountCentre(panel, store);
const music = mountMusic(panel, store, library, media, session);
const steps = mountSteps(panel, store);

store.watch(
  (s) => s.night,
  (n) => {
    const night = nightFor(n);
    applyTheme(themeFor(n));
    byId("tonight").innerHTML = `Night ${night.n} · <b>${night.name}</b> · ${night.date}`;
  },
);

// ---------- Choreography ----------
// Auto: a plan from the analysed song's energy, rebuilt when the song or its beat corrections change.
let autoPlan: SequenceItem[] | null = null;
session.subscribe(() => {
  const map = session.map, grid = session.grid();
  const plan = map && grid ? autoSequence(barEnergies(map, grid)) : null;
  autoPlan = plan && plan.length ? plan : null;
  steps.setAuto(autoPlan);
});

/** The sequence the dancers perform: the auto plan when there is one, else the manual sequence. */
const activeSequence = (scene: Readonly<Scene>): readonly SequenceItem[] =>
  scene.choreography === "auto" && autoPlan ? autoPlan : scene.sequence;

// ---------- Songs ----------
// Selecting a song loads it and analyses its beats (or reads the cached analysis).
store.watch((s) => s.songId, (id) => void session.select(id));

void library.loadManifest().then(() => {
  void session.restoreStatuses();
  const id = store.get().songId;
  // A song dropped in an earlier session is gone after reload.
  if (id && !library.find(id)) store.update((d) => { d.songId = null; });
  else void session.select(id);
});

// Drop songs anywhere on the page.
const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes("Files");
window.addEventListener("dragover", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer!.dropEffect = "copy";
  document.body.classList.add("dragging");
});
window.addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) document.body.classList.remove("dragging");
});
window.addEventListener("drop", (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  document.body.classList.remove("dragging");
  music.addFiles(e.dataTransfer!.files);
});

// ---------- Modes ----------
let mode: "build" | "play" = "build";

const playPanel = mountPlayPanel(byId("playPanel"), {
  onTogglePause: togglePause,
  onRestart: restart,
  onExit: exitPlay,
  onSeek: (t) => media.seek(t),
});

function enterPlay() {
  if (!songSelected()) {
    showStageMessage("Pick a song to start the garba");
    return;
  }
  mode = "play";
  document.body.classList.add("playing");
  enterFullscreen();
  media.seek(0);
  media.play();
  playPanel.show();
  // The header's Play button is hidden now: keep keyboard focus in Play mode, on the panel itself.
  byId("playPanel").focus({ preventScroll: true });
  wake();
}

function exitPlay() {
  mode = "build";
  document.body.classList.remove("playing", "idle");
  media.pause();
  songStarted = false; // leaving Play mode stops the song: the dancers ease back to rest
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  playPanel.hide();
  byId("playBtn").focus();
}

function togglePause() {
  if (clock.paused) clock.resume();
  else clock.pause();
  wake();
}

function restart() {
  clock.restart();
  clock.resume();
  wake();
}

function seekBy(seconds: number) {
  if (media.loaded) media.seek(media.currentTime() + seconds);
  wake();
}

byId("playBtn").onclick = enterPlay;

// A short message over the stage, e.g. when Play garba is pressed with no song selected.
const stageMsg = byId("stageMsg");
let stageMsgTimer = 0;
function showStageMessage(text: string) {
  stageMsg.textContent = text;
  stageMsg.classList.add("show");
  clearTimeout(stageMsgTimer);
  stageMsgTimer = window.setTimeout(() => stageMsg.classList.remove("show"), 3000);
}

// Fullscreen, with graceful fallback when the browser refuses.
let fullscreenByKey = false;
function enterFullscreen() {
  void document.documentElement.requestFullscreen?.().catch(() => {});
}
function toggleFullscreen() {
  if (document.fullscreenElement) {
    fullscreenByKey = true;
    void document.exitFullscreen().catch(() => {});
  } else enterFullscreen();
}
// Browsers swallow Esc to leave fullscreen, so leaving fullscreen that way also leaves Play mode.
document.addEventListener("fullscreenchange", () => {
  if (document.fullscreenElement || mode !== "play") return;
  if (fullscreenByKey) fullscreenByKey = false;
  else exitPlay();
});

document.addEventListener("keydown", (e) => {
  if (mode !== "play") return;
  wake(); // any key press brings the panel back
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const target = e.target as HTMLElement;
  const onButton = !!target.closest("button");
  const onSlider = target instanceof HTMLInputElement;
  switch (e.key) {
    case "Escape": exitPlay(); break;
    case " ": if (!onButton) { e.preventDefault(); togglePause(); } break;
    case "ArrowLeft": if (!onSlider) { e.preventDefault(); seekBy(-5); } break;
    case "ArrowRight": if (!onSlider) { e.preventDefault(); seekBy(5); } break;
    case "r": case "R": restart(); break;
    case "f": case "F": toggleFullscreen(); break;
  }
});

// The panel fades after 3 s without mouse movement and returns on mouse move or any key press.
// It overlays the stage, so the ground never moves when it appears or disappears.
let idleTimer = 0;
function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = window.setTimeout(() => {
    if (mode === "play") document.body.classList.add("idle");
  }, 3000);
}
window.addEventListener("mousemove", () => { if (mode === "play") wake(); });

// ---------- YouTube screen ----------
// The YouTube player must stay visible while a YouTube song is selected (YouTube's rules), and moving an
// iframe in the page would reload it. So the screen stays put in the page and is only positioned: in
// Build mode over its slot in the Music section's Now playing box, in Play mode in the bottom-right
// corner, where the ground keeps clear of it. It doesn't fade with the Play panel.
const ytScreen = byId("ytScreen");
const panelEl = byId("panel");
const stageEl = byId("stage");
/** Play mode player size and its gap to the window edges (CSS px). */
const PLAY_SCREEN = { w: 356, h: 200, margin: 16 };
/** The screen's rect in stage coordinates while it's in Play mode, for the ground to avoid. */
let playScreenRect: Rect | null = null;
let placed = "";
function placeYouTubeScreen() {
  const slot = document.getElementById("ytSlot");
  let r: { left: number; top: number; width: number; height: number } | null = null;
  let clip = "none";
  if (session.source === "youtube" && !session.error) {
    if (mode === "play") {
      const { w, h, margin } = PLAY_SCREEN;
      r = { left: window.innerWidth - w - margin, top: window.innerHeight - h - margin, width: w, height: h };
    } else if (slot && slot.getClientRects().length) {
      // Sit exactly on the slot, so it scrolls with the panel like any other content. Whatever part
      // is scrolled out of the panel is clipped, so it never draws over the header or the ground.
      const s = slot.getBoundingClientRect();
      const p = panelEl.getBoundingClientRect();
      r = { left: s.left, top: s.top, width: s.width, height: s.height };
      const above = Math.max(0, p.top - s.top), below = Math.max(0, s.bottom - p.bottom);
      if (above || below) clip = `inset(${above}px 0 ${below}px 0)`;
    }
  }
  const stage = stageEl.getBoundingClientRect();
  playScreenRect = r && mode === "play" ? { x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height } : null;
  const key = r ? `${r.left},${r.top},${r.width},${r.height},${clip}` : "";
  if (key === placed) return;
  placed = key;
  ytScreen.hidden = !r;
  if (r) Object.assign(ytScreen.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, clipPath: clip });
}

// T taps the beat in either mode: tap-to-sync for YouTube songs, tap to correct for analysed files.
document.addEventListener("keydown", (e) => {
  if ((e.key !== "t" && e.key !== "T") || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.target as HTMLElement).closest("input, textarea, select")) return;
  music.tap();
});

// ---------- Frame loop ----------
const renderer = createRenderer(byId<HTMLCanvasElement>("stageCanvas"), byId("stage"));
const nowStep = byId("nowStep");
let shownStep: string | null = null;
let shownSequence: readonly SequenceItem[] | null = null;
/** Beat position at rest before any song: between beats, so beat-driven lights and glows sit quietly. */
const REST_BEAT = 0.5;
/** Flame flicker phase per second at rest: slower than dancing, a gentle flicker. */
const REST_FLICKER = 1.2;
// The beat positions shown, held still whenever no song plays.
let beat = REST_BEAT;
let stepBeat: number | null = null;

function tick() {
  const scene = store.get();
  // Reduced motion: still preview in Build mode, full dance only in Play.
  const still = reduceMotion.matches && mode === "build";
  const motion: Motion = still || !songStarted ? "resting" : clock.paused ? "paused" : "dancing";
  if (motion === "dancing" || motion === "paused") {
    beat = clock.beat();
    stepBeat = clock.stepBeat();
  }
  const resting = motion === "resting";
  const flick = resting && !reduceMotion.matches ? (performance.now() / 1000) * REST_FLICKER : beat;

  placeYouTubeScreen(); // every frame: the slot moves with panel scrolling, list changes and resizes
  const sequence = activeSequence(scene);
  if (sequence !== shownSequence) {
    shownSequence = sequence;
    playPanel.setSequence(sequence);
  }

  renderer.draw({
    scene: sequence === scene.sequence ? scene : { ...scene, sequence: sequence as SequenceItem[] },
    beat,
    stepBeat,
    bpm: clock.bpm(),
    motion,
    flick,
    playMode: mode === "play",
    avoid: playScreenRect,
    time: performance.now() / 1000,
  });

  // At rest no step is current: the dancers stand in the resting pose.
  const pos = resting || stepBeat === null ? null : sequenceAt(sequence, stepBeat);
  steps.setCurrent(pos?.index ?? -1);
  music.tick();
  if (mode === "play") {
    const song = media.loaded ? library.find(store.get().songId) : undefined;
    const waiting = !resting && stepBeat === null && sequence.length > 0;
    playPanel.update(pos, clock.paused, song ? { title: song.title, time: media.currentTime(), duration: media.duration } : null, waiting);
  } else if ((pos?.step ?? null) !== shownStep) {
    shownStep = pos?.step ?? null;
    nowStep.innerHTML = pos ? `<span class="gu">${STEPS[pos.step].gu}</span><br><span class="en">${STEPS[pos.step].en} · ${STEPS[pos.step].feel}</span>` : "";
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
