import { themeFor } from "../data/nights";
import { STEPS } from "../data/steps";
import { sequenceAt, swapsBefore } from "../state/sequence";
import type { Scene } from "../state/types";
import { rgba, shade } from "../util/color";
import { TAU } from "../util/math";
import { drawMan, drawWoman } from "./dancers";
import { drawBetween } from "./festive/between";
import { drawCentre } from "./festive/centrepieces";
import { EDGE_LIGHT_RADIUS, computeLayout, type Rect } from "./layout";
import { PatternCache, printColours, tilePx } from "./patterns";
import { blendPose, pose, restPose } from "./poses";
import { bump, flash, mod } from "./pulse";
import { circle } from "./shapes";

export type Motion = "dancing" | "paused" | "resting";

/** Everything one frame needs. The renderer never reads the DOM panel or audio directly. */
export interface Frame {
  scene: Readonly<Scene>;
  /** Beat position: drives every pulse, clap spark and hop. */
  beat: number;
  /** Position in the step sequence (beats from the first downbeat, negative before it), or null at rest before any song. */
  stepBeat: number | null;
  /** Local tempo. */
  bpm: number;
  /**
   * dancing: a song is playing. paused: a started song is paused, so everything freezes in place.
   * resting: no song playing; dancers ease back to the resting pose and the circles ease to a stop.
   */
  motion: Motion;
  /** Flame flicker phase: the beat while dancing or paused, slow wall-clock time at rest. */
  flick: number;
  playMode: boolean;
  /** Play mode: screen area the ground must stay clear of (the YouTube player), in stage CSS px. */
  avoid?: Rect | null;
  /** Seconds, only for easing circle speed between frames (never for pulses). */
  time: number;
}

/** Steps blend into each other over the first quarter-beat. */
const BLEND_BEATS = 0.25;
/** How quickly circle speed eases towards its target (per second). */
const SPEED_EASE = 4;
/** Circle speed (radians per second) below which a slowing circle stops outright. */
const MIN_SPEED = 0.003;
/** How quickly dancers ease from dancing back to the resting pose (per second). */
const REST_EASE = 2.5;
/** Seconds a song's start takes to bring dancers from rest to full pose and circle speed. */
const START_S = 0.15;

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
  /** 0 = dancing, 1 = resting pose. The page opens at rest. */
  let rest = 1;
  /** When the dancers last set off from rest (seconds), for the short start ramp. */
  let startedAt = -Infinity;
  let lastMotion: Motion = "resting";

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

  function draw({ scene, beat, stepBeat, bpm, motion, flick, playMode, avoid = null, time }: Frame) {
    if (!ctx || !width || !height) return;
    const dt = lastTime === null ? 0 : Math.min(0.1, Math.max(0, time - lastTime));
    lastTime = time;
    // Starting: straight into the dance within START_S, so the motion begins with the sound.
    // Stopping: a slow ease back to rest.
    if (motion === "dancing" && lastMotion === "resting") startedAt = time;
    lastMotion = motion;
    const startAge = time - startedAt;
    const starting = startAge - dt < START_S; // through the first frame at or past the end of the ramp
    if (motion === "dancing") rest = Math.max(0, rest - dt / START_S);
    else if (motion === "resting") rest += (1 - rest) * Math.min(1, dt * REST_EASE);
    const restBlend = rest > 0.99 ? 1 : rest * rest * (3 - 2 * rest);
    const still = restPose(scene.sequence[0]?.step ?? null);

    const night = themeFor(scene.night);
    const L = computeLayout(width, height, scene.circles.length, playMode, scene.betweenDecor.length > 0, avoid);
    const pos = stepBeat === null ? null : sequenceAt(scene.sequence, stepBeat);

    // Background and centre glow.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = night.bg;
    ctx.fillRect(0, 0, width, height);
    const { cx, cy } = L;
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

    drawBetween(ctx, scene.betweenDecor, L.lanes, beat, flick, night);
    drawCentre(ctx, scene.centre, { c: L.inner * 0.62, outer: L.outer, beat, flick, palette: [night.wearDark, night.wear, night.accent] });

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

    // Partner swaps completed so far: when odd, partners stand in each other's places.
    const swapped = stepBeat !== null && (swapsBefore(scene.sequence, stepBeat) & 1) === 1;
    const partnerSparks: [number, number, number][] = []; // x, y, strength

    scene.circles.forEach((circle, ri) => {
      const r = L.radii[ri], n = L.counts[ri];
      // Screen y points down, so anticlockwise is a decreasing angle.
      const sign = circle.direction === "ccw" ? -1 : 1;
      const target = motion === "dancing" ? (sign * travel * (bpm / 60) * (s * 0.32)) / r : 0;
      // Paused: hold both, so resuming carries on at the same place and speed.
      if (motion !== "paused") {
        if (starting) speed[ri] = target * Math.min(1, startAge / START_S);
        else speed[ri] += (target - speed[ri]) * Math.min(1, dt * SPEED_EASE);
        if (target === 0 && Math.abs(speed[ri]) < MIN_SPEED) speed[ri] = 0; // come to a real stop
        angle[ri] += speed[ri] * dt;
      }

      // Poses and positions per slot (a place on the circle).
      const poses = Array.from({ length: n }, (_, slot) => {
        if (restBlend === 1) return still;
        const p = pose(pos?.step ?? null, pos?.beatInStep ?? 0, slot);
        const danced = blend < 1 && pos?.prev ? blendPose(pose(pos.prev.step, pos.prev.lengthBeats, slot), p, blend) : p;
        return restBlend > 0 ? blendPose(danced, still, restBlend) : danced;
      });
      const xy = poses.map((p, slot) => {
        const th = angle[ri] + (slot / n) * TAU + (p.tang * s) / r;
        const rad = r - L.gatherIn[ri] * p.gather + p.radial * s;
        return [Math.cos(th) * rad, Math.sin(th) * rad];
      });
      // Partner swap: each pair (slots 2k, 2k+1) turns half a turn around the point between them.
      const orbit = poses[0].orbit;
      if (orbit) {
        const c = Math.cos(orbit), sn = Math.sin(orbit);
        for (let k = 0; k + 1 < n; k += 2) {
          const mx = (xy[k][0] + xy[k + 1][0]) / 2, my = (xy[k][1] + xy[k + 1][1]) / 2;
          for (const q of [k, k + 1]) {
            const dx = xy[q][0] - mx, dy = xy[q][1] - my;
            xy[q] = [mx + dx * c - dy * sn, my + dx * sn + dy * c];
          }
        }
      }

      for (let slot = 0; slot < n; slot++) {
        const p = poses[slot];
        const [x, y] = xy[slot];
        const who = swapped ? slot ^ 1 : slot; // which dancer stands here
        const outfit = { ...outfits[(who + ri) % 3], mirrorGlint };
        const isMan = circle.arrangement === "men" || (circle.arrangement === "alternate" && who % 2 === 1);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(y, x) + Math.PI / 2 + p.sway + p.selfRot);
        if (p.scale !== 1 || p.squash !== 1) ctx.scale(p.scale, p.scale * p.squash);
        if (isMan) drawMan(ctx, s, p, outfit);
        else drawWoman(ctx, s, p, outfit);
        ctx.restore();
      }

      // Hudo: partners' palms meet between them.
      const clap = poses[0].partnerClap;
      if (clap > 0.3) {
        for (let k = poses[0].pairOffset; k < n; k += 2) {
          const a = xy[k], b = xy[(k + 1) % n];
          partnerSparks.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, clap]);
        }
      }
    });

    // Clap sparks last, over every dancer.
    if (partnerSparks.length) {
      ctx.lineWidth = 0.022 * s;
      ctx.strokeStyle = `rgba(255,236,170,${Math.min(1, partnerSparks[0][2])})`;
      ctx.beginPath();
      for (const [x, y, k] of partnerSparks) {
        const r0 = 0.04 * s, r1 = (0.04 + 0.09 * k) * s;
        for (let i = 0; i < 6; i++) {
          const an = (i / 6) * TAU;
          ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0);
          ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1);
        }
      }
      ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  return { draw };
}
