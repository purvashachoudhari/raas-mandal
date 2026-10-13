import { TAU, clamp } from "../util/math";
import { MIRROR, MIRROR_EDGE } from "./patterns/abhla";
import type { Pose } from "./poses";
import { circle } from "./shapes";

// Dancers are drawn in local units scaled by s (dancer size): head at −y (outward), garment at +y (centre).

const SKIN = "#c98a5a";
const HAIR = "#24150f";
const CREAM = "#fff6e2";

export interface Outfit {
  /** Print fill for the ghagra / kediyu. */
  fill: CanvasPattern | string;
  /** Darker garment colour for the hem outline. */
  hemLine: string;
  /** Trim colour for choli, pagdi and stick bands. */
  trim: string;
  /** Darker trim for the choli's lower band. */
  trimDark: string;
  /** Hem dot colour. */
  hem: string;
  /** Abhla bharat only: glint strength (0–1) of the hem mirrors, driven by the beat. */
  mirrorGlint: number | null;
}


function drawArms(ctx: CanvasRenderingContext2D, s: number, p: Pose, stickColour: string) {
  const a = clamp(p.arms, 0, 1);
  const hands: [number, number, number, number][] = []; // hand x, y and forearm direction
  ctx.strokeStyle = SKIN; ctx.lineWidth = 0.045 * s; ctx.lineCap = "round";
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const sx = side * 0.075 * s, sy = -0.22 * s;
    const hx = side * (0.3 + (0.035 - 0.3) * a) * s, hy = (-0.4 + (-0.58 + 0.4) * a) * s;
    const ex = side * (0.25 + (0.14 - 0.25) * a) * s, ey = (-0.18 + (-0.36 + 0.18) * a) * s;
    ctx.moveTo(sx, sy); ctx.quadraticCurveTo(ex, ey, hx, hy);
    const len = Math.hypot(hx - ex, hy - ey) || 1;
    hands.push([hx, hy, (hx - ex) / len, (hy - ey) / len]);
  }
  ctx.stroke();
  if (p.stick) {
    ctx.strokeStyle = "#c48a3c"; ctx.lineWidth = 0.032 * s;
    ctx.beginPath();
    for (const [hx, hy, ux, uy] of hands) { ctx.moveTo(hx, hy); ctx.lineTo(hx + ux * 0.24 * s, hy + uy * 0.24 * s); }
    ctx.stroke();
    ctx.strokeStyle = stickColour; ctx.lineWidth = 0.034 * s;
    ctx.beginPath();
    for (const [hx, hy, ux, uy] of hands) { ctx.moveTo(hx + ux * 0.17 * s, hy + uy * 0.17 * s); ctx.lineTo(hx + ux * 0.22 * s, hy + uy * 0.22 * s); }
    ctx.stroke();
  }
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  for (const [hx, hy] of hands) circle(ctx, hx, hy, 0.028 * s);
  ctx.fill();
  // Clap spark above the hands.
  if (p.flash > 0.3) {
    ctx.strokeStyle = `rgba(255,236,170,${Math.min(1, p.flash)})`; ctx.lineWidth = 0.022 * s;
    const cy = (p.stick ? -0.72 : -0.64) * s, r0 = 0.05 * s, r1 = (0.05 + 0.08 * p.flash) * s;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const an = (i / 6) * TAU;
      ctx.moveTo(Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.lineTo(Math.cos(an) * r1, cy + Math.sin(an) * r1);
    }
    ctx.stroke();
  }
}

/** Point i of n along a hem curve: half-width w, end height y, sagging by `sag` at the middle. */
const hemX = (s: number, w: number, i: number, n: number) => (-w + (2 * w * i) / (n - 1)) * s;
const hemY = (s: number, y: number, sag: number, i: number, n: number) => (y + sag * (1 - ((2 * i) / (n - 1) - 1) ** 2)) * s;

function hemDots(ctx: CanvasRenderingContext2D, s: number, w: number, y: number, sag: number, n: number, colour: string) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  for (let i = 0; i < n; i++) circle(ctx, hemX(s, w, i, n), hemY(s, y, sag, i, n), 0.02 * s);
  ctx.fill();
}

/** Abhla bharat border: an embroidered band along the hem set with round mirrors that glint on the beat. */
function mirrorBand(ctx: CanvasRenderingContext2D, s: number, w: number, y: number, sag: number, n: number, o: Outfit, glint: number) {
  ctx.strokeStyle = o.trim; ctx.lineWidth = 0.075 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(-w * s, y * s); ctx.quadraticCurveTo(0, (y + 2 * sag) * s, w * s, y * s); ctx.stroke();
  const r = 0.026 * s;
  ctx.beginPath();
  for (let i = 0; i < n; i++) circle(ctx, hemX(s, w, i, n), hemY(s, y, sag, i, n), r);
  ctx.fillStyle = MIRROR; ctx.fill();
  ctx.strokeStyle = MIRROR_EDGE; ctx.lineWidth = 0.008 * s; ctx.stroke();
  // Alternate mirrors catch the light more strongly, so the band sparkles rather than blinks.
  for (const [parity, strength] of [[1, 1], [0, 0.6]] as const) {
    const g = glint * strength;
    if (g <= 0.05) continue;
    ctx.fillStyle = `rgba(255,255,255,${g})`;
    ctx.beginPath();
    for (let i = parity; i < n; i += 2) circle(ctx, hemX(s, w, i, n), hemY(s, y, sag, i, n), r * (1 + 0.5 * g));
    ctx.fill();
  }
}

/** Chaniya choli: flared ghagra, choli, dupatta-covered head with bun. */
export function drawWoman(ctx: CanvasRenderingContext2D, s: number, p: Pose, o: Outfit) {
  const hw = 0.22 * p.flare, hy = 0.37;
  ctx.beginPath(); ctx.moveTo(-0.075 * s, -0.08 * s); ctx.lineTo(0.075 * s, -0.08 * s); ctx.lineTo(hw * s, hy * s);
  ctx.quadraticCurveTo(0, (hy + 0.16) * s, -hw * s, hy * s); ctx.closePath();
  ctx.fillStyle = o.fill; ctx.fill();
  ctx.strokeStyle = o.hemLine; ctx.lineWidth = 0.055 * s;
  ctx.beginPath(); ctx.moveTo(hw * s, hy * s); ctx.quadraticCurveTo(0, (hy + 0.16) * s, -hw * s, hy * s); ctx.stroke();
  if (o.mirrorGlint === null) hemDots(ctx, s, hw * 0.92, hy + 0.005, 0.08, 7, o.hem);
  else mirrorBand(ctx, s, hw * 0.92, hy - 0.01, 0.08, 7, o, o.mirrorGlint);
  ctx.fillStyle = o.trim; ctx.beginPath(); ctx.roundRect(-0.075 * s, -0.25 * s, 0.15 * s, 0.18 * s, 0.03 * s); ctx.fill();
  ctx.fillStyle = o.trimDark; ctx.fillRect(-0.075 * s, -0.1 * s, 0.15 * s, 0.025 * s);
  drawArms(ctx, s, p, o.trim);
  ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(0, -0.44 * s, 0.05 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(0, -0.335 * s, 0.083 * s, 0, TAU); ctx.fill();
  ctx.fillStyle = HAIR; ctx.beginPath(); ctx.arc(0, -0.335 * s, 0.085 * s, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
  ctx.fillStyle = "#f2c94c"; ctx.beginPath(); ctx.arc(0, -0.385 * s, 0.018 * s, 0, TAU); ctx.fill();
}

/** Kediyu with churidar and pagdi. */
export function drawMan(ctx: CanvasRenderingContext2D, s: number, p: Pose, o: Outfit) {
  const fl = 1 + (p.flare - 1) * 0.8;
  ctx.fillStyle = "#efe4cc";
  ctx.beginPath();
  ctx.roundRect(-0.095 * s, 0.06 * s, 0.065 * s, 0.29 * s, 0.025 * s);
  ctx.roundRect(0.03 * s, 0.06 * s, 0.065 * s, 0.29 * s, 0.025 * s);
  ctx.fill();
  ctx.fillStyle = "#3a2316";
  ctx.beginPath();
  for (const side of [-1, 1]) { ctx.moveTo(side * 0.062 * s + 0.04 * s, 0.37 * s); ctx.ellipse(side * 0.062 * s, 0.37 * s, 0.04 * s, 0.028 * s, 0, 0, TAU); }
  ctx.fill();
  const hw = 0.2 * fl;
  ctx.beginPath(); ctx.moveTo(-0.085 * s, -0.25 * s); ctx.lineTo(0.085 * s, -0.25 * s); ctx.lineTo(0.08 * s, -0.06 * s);
  ctx.lineTo(hw * s, 0.13 * s); ctx.quadraticCurveTo(0, 0.22 * s, -hw * s, 0.13 * s); ctx.lineTo(-0.08 * s, -0.06 * s); ctx.closePath();
  ctx.fillStyle = o.fill; ctx.fill();
  ctx.strokeStyle = o.hemLine; ctx.lineWidth = 0.04 * s;
  ctx.beginPath(); ctx.moveTo(hw * s, 0.13 * s); ctx.quadraticCurveTo(0, 0.22 * s, -hw * s, 0.13 * s); ctx.stroke();
  if (o.mirrorGlint !== null) mirrorBand(ctx, s, hw * 0.9, 0.12, 0.045, 5, o, o.mirrorGlint);
  ctx.strokeStyle = o.trim; ctx.lineWidth = 0.03 * s; ctx.beginPath(); ctx.moveTo(-0.08 * s, -0.07 * s); ctx.lineTo(0.08 * s, -0.07 * s); ctx.stroke();
  drawArms(ctx, s, p, o.trim);
  ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(0, -0.335 * s, 0.08 * s, 0, TAU); ctx.fill();
  // Pagdi: crown and top knot in one path.
  ctx.fillStyle = o.trim;
  ctx.beginPath();
  ctx.ellipse(0, -0.37 * s, 0.1 * s, 0.065 * s, 0, Math.PI, TAU);
  circle(ctx, 0, -0.43 * s, 0.035 * s);
  ctx.fill();
  ctx.fillStyle = CREAM; ctx.beginPath(); ctx.arc(0, -0.39 * s, 0.014 * s, 0, TAU); ctx.fill();
}
