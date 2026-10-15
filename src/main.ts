import "./styles/tokens.css";
import "./styles/panel.css";
import "./styles/stage.css";
import "./styles/play.css";

import { createSongClock } from "./audio/beatClock";
import { createLibrary } from "./audio/library";
import { createSongSession } from "./audio/session";
import { createYouTubePlayer } from "./audio/youtube";
import { themeFor } from "./data/nights";
import type { Lang, Strings } from "./data/strings";
import { sequenceAt } from "./state/sequence";
import { createStore } from "./state/store";
import type { SequenceItem } from "./state/types";
import type { Rect } from "./stage/layout";
import { createRenderer, type Motion } from "./stage/renderer";
import { mountArrangement } from "./ui/arrangement";
import { mountCentre } from "./ui/centre";
import { mountCircles } from "./ui/circles";
import { mountDirection } from "./ui/direction";
import { byId } from "./ui/dom";
import { getLang, localized, setLang, t } from "./ui/i18n";
import { mountMusic } from "./ui/music";
import { mountNights } from "./ui/nights";
import { mountPlayPanel } from "./ui/playPanel";
import { mountPrints } from "./ui/prints";
import { mountSteps } from "./ui/steps";
import { applyTheme } from "./ui/theme";

const store = createStore();
const library = createLibrary();
/** Songs play from YouTube (§5.7). */
const player = createYouTubePlayer(byId("ytFrame"));
const session = createSongSession(library, player);
/** One clock: the song's playback position, mapped to its synced beats. */
const clock = createSongClock(player, () => session.grid());
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const songSelected = () => player.loaded || player.loading;

// ---------- Motion ----------
// The dancers only dance while a song plays. A started song that's paused freezes them in place;
// once it ends or is stopped (or no song is selected) they ease back to the resting pose.
let songStarted = false;
player.subscribe((e) => {
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
const music = mountMusic(panel, store, library, player, session);
const steps = mountSteps(panel, store);

store.watch((s) => s.night, (n) => applyTheme(themeFor(n)));

// Declared before the language block, whose first run uses them.
const stageMsg = byId("stageMsg");
let stageMsgText: ((s: Strings) => string) | null = null;
/** The step shown under the stage in Build mode (undefined: nothing rendered yet). */
let shownStep: string | null | undefined;

// ---------- Language ----------
// EN | ગુ beside Play garba: one language at a time (strings in data/strings.ts).
const langToggle = byId("langToggle");
const langButtons = [...langToggle.querySelectorAll<HTMLButtonElement>("button[data-lang]")];
for (const b of langButtons) b.onclick = () => setLang(b.dataset.lang as Lang);
localized(() => {
  const s = t();
  for (const b of langButtons) b.setAttribute("aria-pressed", String(b.dataset.lang === getLang()));
  langToggle.setAttribute("aria-label", s.language);
  byId("playLabel").textContent = s.playGarba;
  byId("stageTag").textContent = s.preview;
  byId("stageCanvas").setAttribute("aria-label", s.stageAria);
  byId("panel").setAttribute("aria-label", s.panelAria);
  byId("narrowTitle").textContent = s.narrowTitle;
  byId("narrowBody").textContent = s.narrowBody;
  if (stageMsgText) stageMsg.textContent = stageMsgText(s);
  shownStep = undefined; // re-render the current step's name
});

// ---------- Songs ----------
// The last song comes back on reload, unless it's gone (a removed link, or a local file saved
// before songs became YouTube-only).
{
  const id = store.get().songId;
  if (id && !library.find(id)) store.update((d) => { d.songId = null; });
}
// Selecting a song cues it on YouTube.
store.watch((s) => s.songId, (id) => void session.select(id));

// ---------- Modes ----------
let mode: "build" | "play" = "build";

const playPanel = mountPlayPanel(byId("playPanel"), {
  onTogglePause: togglePause,
  onRestart: restart,
  onExit: exitPlay,
  onSeek: (t) => player.seek(t),
});

function enterPlay() {
  if (!songSelected()) {
    showStageMessage((s) => s.pickSong);
    return;
  }
  mode = "play";
  document.body.classList.add("playing");
  enterFullscreen();
  player.seek(0);
  player.play();
  playPanel.show();
  // The header's Play button is hidden now: keep keyboard focus in Play mode, on the panel itself.
  byId("playPanel").focus({ preventScroll: true });
  wake();
}

function exitPlay() {
  mode = "build";
  document.body.classList.remove("playing", "idle");
  player.pause();
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
  if (player.loaded) player.seek(player.currentTime() + seconds);
  wake();
}

byId("playBtn").onclick = enterPlay;

// A short message over the stage, e.g. when Play garba is pressed with no song selected.
let stageMsgTimer = 0;
function showStageMessage(text: (s: Strings) => string) {
  stageMsgText = text;
  stageMsg.textContent = text(t());
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
  if (session.songId && !session.error) {
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

// T taps the beat in either mode (tap-to-sync, §5.8).
document.addEventListener("keydown", (e) => {
  if ((e.key !== "t" && e.key !== "T") || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((e.target as HTMLElement).closest("input, textarea, select")) return;
  music.tap();
});

// ---------- Frame loop ----------
const renderer = createRenderer(byId<HTMLCanvasElement>("stageCanvas"), byId("stage"));
const nowStep = byId("nowStep");
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
  const sequence = scene.sequence;
  if (sequence !== shownSequence) {
    shownSequence = sequence;
    playPanel.setSequence(sequence);
  }

  renderer.draw({
    scene,
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
    const song = player.loaded ? library.find(store.get().songId) : undefined;
    const waiting = !resting && stepBeat === null && sequence.length > 0;
    playPanel.update(pos, clock.paused, song ? { title: song.title, time: player.currentTime(), duration: player.duration } : null, waiting);
  } else if ((pos?.step ?? null) !== shownStep) {
    shownStep = pos?.step ?? null;
    const st = pos ? t().steps[pos.step] : null;
    nowStep.innerHTML = st ? `<span class="main">${st.name}</span><br><span class="sub">${st.feel}</span>` : "";
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
