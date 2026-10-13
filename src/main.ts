import "./styles/tokens.css";
import "./styles/panel.css";
import "./styles/stage.css";
import "./styles/play.css";

import { createPreviewClock, createSongClock, type BeatClock } from "./audio/beatClock";
import { createLibrary } from "./audio/library";
import { createPlayer } from "./audio/player";
import { createSongSession } from "./audio/session";
import { nightFor, themeFor } from "./data/nights";
import { STEPS } from "./data/steps";
import { autoSequence, barEnergies } from "./state/choreography";
import { sequenceAt } from "./state/sequence";
import { createStore } from "./state/store";
import type { Scene, SequenceItem } from "./state/types";
import { createRenderer } from "./stage/renderer";
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
const previewClock = createPreviewClock();
const session = createSongSession(library, player);
const songClock = createSongClock(player, () => session.grid());
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/** One clock: the song's playback position (mapped to its detected beats) whenever a song is selected, else the preview tempo. */
const songSelected = () => player.loaded || player.loading;
const clock = (): BeatClock => (songSelected() ? songClock : previewClock);

// ---------- Panel ----------
const panel = byId("panel");
mountNights(panel, store);
mountPrints(panel, store);
mountCircles(panel, store);
mountDirection(panel, store);
mountArrangement(panel, store);
mountCentre(panel, store);
const music = mountMusic(panel, store, library, player, session);
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
  onSeek: (t) => player.seek(t),
});

function enterPlay() {
  mode = "play";
  document.body.classList.add("playing");
  enterFullscreen();
  if (songSelected()) {
    player.seek(0);
    player.play();
  } else {
    previewClock.restart();
    previewClock.resume();
  }
  playPanel.show();
  // The header's Play button is hidden now: keep keyboard focus in Play mode, on the panel itself.
  byId("playPanel").focus({ preventScroll: true });
  wake();
}

function exitPlay() {
  mode = "build";
  document.body.classList.remove("playing", "idle");
  player.pause();
  previewClock.resume();
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  playPanel.hide();
  byId("playBtn").focus();
}

function togglePause() {
  const c = clock();
  if (c.paused) c.resume();
  else c.pause();
  wake();
}

function restart() {
  const c = clock();
  c.restart();
  c.resume();
  wake();
}

function seekBy(seconds: number) {
  if (player.loaded) player.seek(player.currentTime() + seconds);
  wake();
}

byId("playBtn").onclick = enterPlay;

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

// ---------- Frame loop ----------
const renderer = createRenderer(byId<HTMLCanvasElement>("stageCanvas"), byId("stage"));
const nowStep = byId("nowStep");
let shownStep: string | null = null;
let shownSequence: readonly SequenceItem[] | null = null;

function tick() {
  const scene = store.get();
  const c = clock();
  // Reduced motion: static preview in Build mode, full dance only in Play.
  const still = reduceMotion.matches && mode === "build";
  const beat = still ? 0 : c.beat();
  const stepBeat = still ? 0 : c.stepBeat();

  const sequence = activeSequence(scene);
  if (sequence !== shownSequence) {
    shownSequence = sequence;
    playPanel.setSequence(sequence);
  }

  renderer.draw({
    scene: sequence === scene.sequence ? scene : { ...scene, sequence: sequence as SequenceItem[] },
    beat,
    stepBeat,
    bpm: c.bpm(),
    moving: !still && !c.paused,
    playMode: mode === "play",
    time: performance.now() / 1000,
  });

  const pos = stepBeat === null ? null : sequenceAt(sequence, stepBeat);
  steps.setCurrent(pos?.index ?? -1);
  music.tick();
  if (mode === "play") {
    const song = player.loaded ? library.find(player.id) : undefined;
    const waiting = stepBeat === null && sequence.length > 0;
    playPanel.update(pos, c.paused, song ? { title: song.title, time: player.currentTime(), duration: player.duration } : null, waiting);
  } else if ((pos?.step ?? null) !== shownStep) {
    shownStep = pos?.step ?? null;
    nowStep.innerHTML = pos ? `<span class="gu">${STEPS[pos.step].gu}</span><br><span class="en">${STEPS[pos.step].en} · ${STEPS[pos.step].feel}</span>` : "";
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
