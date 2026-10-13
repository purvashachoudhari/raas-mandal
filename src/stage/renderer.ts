import { themeFor } from "../data/nights";
import { STEPS } from "../data/steps";
import { sequenceAt } from "../state/sequence";
import type { Scene } from "../state/types";
import { rgba, shade } from "../util/color";
import { TAU } from "../util/math";
import { drawMan, drawWoman } from "./dancers";
import { drawBetween } from "./festive/between";
import { drawCentre } from "./festive/centrepieces";
import { EDGE_LIGHT_RADIUS, computeLayout } from "./layout";
import { PatternCache, printColours, tilePx } from "./patterns";
import { blendPose, pose } from "./poses";
import { bump, flash, mod } from "./pulse";
import { circle } from "./shapes";

/** Everything one frame needs. The renderer never reads the DOM panel or audio directly. */
export interface Frame {
  scene: Readonly<Scene>;
  /** Beat position: drives every pulse, clap spark and hop. */
  beat: number;
  /** Position in the step sequence (beats from the first downbeat), or null while waiting for it. */
  stepBeat: number | null;
  /** Local tempo. */
  bpm: number;
  /** False when paused or frozen for reduced motion: circles ease to a stop. */
  moving: boolean;
  playMode: boolean;
  /** Seconds, only for easing circle speed between frames (never for pulses). */
  time: number;
}

/** Steps blend into each other over the first quarter-beat. */
const BLEND_BEATS = 0.25;
/** How quickly circle speed eases towards its target (per second). */
const SPEED_EASE = 4;

export interface Renderer {
  draw(frame: Frame): void;
}

export function createRenderer(canvas: HTMLCanvasElement, host: HTMLElement): Renderer {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available");
  const patterns = new PatternCache();
  let width = 0, height = 0, dpr = 1;
  const angle = [0, 0, 0, 0, 0];
  const speed = [0, 0, 0, 0, 0];
  let lastTime: number | null = null;

  function resize() {
    const r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = r.width;
    height = r.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    patterns.clear();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  function draw({ scene, beat, stepBeat, bpm, moving, playMode, time }: Frame) {
    if (!ctx || !width || !height) return;
    const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;

    const night = themeFor(scene.night);
    const L = computeLayout(width, height, scene.circles.length, playMode, scene.betweenDecor.length > 0);
    const pos = stepBeat === null ? null : sequenceAt(scene.sequence, stepBeat);

    // Background and centre glow.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = night.bg;
    ctx.fillRect(0, 0, width, height);
    const cx = width / 2;
    const cy = height / 2;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, L.half * 1.05);
    glow.addColorStop(0, night.glow);
    glow.addColorStop(1, night.bg);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, L.half * 1.05, 0, TAU); ctx.fill();
    ctx.translate(cx, cy);

    // Guide circles.
    ctx.strokeStyle = rgba(night.ink, 0.1);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const r of L.radii) circle(ctx, 0, 0, r);
    ctx.stroke();

    // Edge lights chasing on the half-beat: one path for lit lights, one for unlit.
    const lights = 48, chase = Math.floor(beat * 2);
    for (const lit of [false, true]) {
      ctx.fillStyle = lit ? "#ffe9a8" : rgba(night.ink, 0.35);
      ctx.beginPath();
      for (let i = 0; i < lights; i++) {
        if ((mod(i + chase, 4) === 0) !== lit) continue;
        const a = (i / lights) * TAU;
        circle(ctx, Math.cos(a) * L.half, Math.sin(a) * L.half, L.half * (lit ? EDGE_LIGHT_RADIUS : 0.008));
      }
      ctx.fill();
    }

    // Twinkling rings around the centre: alternate lights swap brightness on each beat.
    const twinkle = flash(beat, 0.1);
    for (const parity of [0, 1]) {
      ctx.fillStyle = `rgba(255,246,220,${0.45 + 0.5 * (parity ? twinkle : 1 - twinkle)})`;
      ctx.beginPath();
      for (const [rr, n, off] of [[L.inner * 0.82, 14, 0], [L.inner * 1.02, 18, 0.5]]) {
        for (let i = parity; i < n; i += 2) {
          const a = ((i + off) / n) * TAU + (off ? -1 : 1) * beat * 0.05;
          circle(ctx, Math.cos(a) * rr, Math.sin(a) * rr, L.inner * 0.035);
        }
      }
      ctx.fill();
    }

    drawBetween(ctx, scene.betweenDecor, L.lanes, beat, night);
    drawCentre(ctx, scene.centre, { c: L.inner * 0.62, outer: L.outer, beat, palette: [night.wearDark, night.wear, night.accent] });

    // Dancers, inner circle to outer.
    const s = L.size;
    const travel = pos ? STEPS[pos.step].travel : 0;
    const tile = tilePx(scene.print, s, dpr);
    // Dancers wear the night's colour, cycling through its tonal variants so a circle isn't a flat block.
    const tones = [night.wear, night.wearLight, night.wearDark];
    const outfits = tones.map((base) => {
      const colours = printColours(base, night);
      return {
        fill: patterns.get(ctx, scene.print, colours, tile, dpr),
        hemLine: shade(base, -0.38),
        trim: night.accent,
        trimDark: shade(night.accent, -0.3),
        hem: colours.cream,
      };
    });
    // Abhla mirrors flash on each beat (peaks either side of the beat boundary).
    const mirrorGlint = scene.print === "abhla" ? bump(beat, 0, 0.09) : null;
    const blend = pos?.prev && pos.beatInStep < BLEND_BEATS ? pos.beatInStep / BLEND_BEATS : 1;

    scene.circles.forEach((circle, ri) => {
      const r = L.radii[ri], n = L.counts[ri];
      // Screen y points down, so anticlockwise is a decreasing angle.
      const sign = circle.direction === "ccw" ? -1 : 1;
      const target = moving ? (sign * travel * (bpm / 60) * (s * 0.32)) / r : 0;
      speed[ri] += (target - speed[ri]) * Math.min(1, dt * SPEED_EASE);
      angle[ri] += speed[ri] * dt;

      for (let j = 0; j < n; j++) {
        let p = pose(pos?.step ?? null, pos?.beatInStep ?? 0, j);
        if (blend < 1 && pos?.prev) p = blendPose(pose(pos.prev.step, pos.prev.lengthBeats, j), p, blend);

        const th = angle[ri] + (j / n) * TAU + (p.tang * s) / r;
        const rad = r + p.radial * s;
        const outfit = { ...outfits[(j + ri) % 3], mirrorGlint };
        const isMan = circle.arrangement === "men" || (circle.arrangement === "alternate" && j % 2 === 1);

        ctx.save();
        ctx.translate(Math.cos(th) * rad, Math.sin(th) * rad);
        ctx.rotate(th + Math.PI / 2 + p.sway + p.selfRot);
        if (p.squash !== 1) ctx.scale(1, p.squash);
        if (isMan) drawMan(ctx, s, p, outfit);
        else drawWoman(ctx, s, p, outfit);
        ctx.restore();
      }
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
