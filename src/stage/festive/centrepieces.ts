import type { CentreId } from "../../state/types";
import { TAU } from "../../util/math";
import { bump, flash, flicker, mod } from "../pulse";
import { circle } from "../shapes";

export interface CentreArgs {
  /** Centrepiece unit radius. */
  c: number;
  /** Outer edge of the ground (the pillar's light strings run to it). */
  outer: number;
  /** Beat position: drives every pulse and slow rotation. Held still while no song plays. */
  beat: number;
  /** Flame flicker phase: keeps going gently at rest, so flames never look frozen. */
  flick: number;
  palette: readonly string[];
}

type Draw = (ctx: CanvasRenderingContext2D, a: CentreArgs) => void;

export function flame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flick: number, seed = 0) {
  const fl = flicker(flick, seed);
  ctx.save();
  ctx.shadowColor = "rgba(255,190,80,.55)"; ctx.shadowBlur = s * 1.2;
  ctx.fillStyle = "#ffb627"; ctx.beginPath(); ctx.moveTo(x, y - s * fl);
  ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.2, x, y + s * 0.25); ctx.quadraticCurveTo(x - s * 0.5, y - s * 0.2, x, y - s * fl); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#fff1b8"; ctx.beginPath(); ctx.ellipse(x, y - s * 0.05, s * 0.13, s * 0.25, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/** Perforated earthen pot with a diya inside; holes pulse on the beat. */
const garbo: Draw = (ctx, { c, beat, flick }) => {
  const pulse = 0.5 + 0.5 * flash(beat);
  ctx.fillStyle = "#9c3f25"; ctx.beginPath(); ctx.ellipse(0, c * 0.1, c * 0.62, c * 0.6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#7a2d18"; ctx.beginPath(); ctx.ellipse(0, -c * 0.42, c * 0.3, c * 0.09, 0, 0, TAU); ctx.fill();
  ctx.save(); ctx.shadowColor = "rgba(255,200,90,.9)"; ctx.shadowBlur = c * 0.12 * (0.6 + pulse);
  ctx.fillStyle = `rgba(255,${200 + 30 * pulse},120,1)`;
  for (let row = 0; row < 4; row++) {
    const ry = -c * 0.18 + row * c * 0.18, rw = c * (0.5 - Math.abs(row - 1.3) * 0.07), n = 7;
    for (let i = 0; i < n; i++) {
      ctx.beginPath(); ctx.arc(-rw + (2 * rw * i) / (n - 1), ry + c * 0.05 * Math.sin((i / (n - 1)) * Math.PI), c * 0.04, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
  ctx.fillStyle = "#c9762d"; ctx.beginPath(); ctx.ellipse(0, -c * 0.48, c * 0.17, c * 0.06, 0, 0, Math.PI); ctx.fill();
  flame(ctx, 0, -c * 0.5, c * 0.2, flick);
};

/** Brass lamp with a flickering flame. */
const jyot: Draw = (ctx, { c, flick }) => {
  for (let i = 3; i >= 0; i--) {
    ctx.fillStyle = i % 2 ? "#b8862b" : "#e2b44a"; ctx.beginPath(); ctx.arc(0, 0, c * (0.25 + i * 0.12), 0, TAU); ctx.fill();
  }
  ctx.fillStyle = "#7a5414"; ctx.beginPath(); ctx.arc(0, 0, c * 0.2, 0, TAU); ctx.fill();
  flame(ctx, 0, c * 0.05, c * 0.38, flick);
};

/** Decorated arch with red chunari, trishul and a diya (abstract, no depiction of the deity). */
const mataji: Draw = (ctx, { c, flick }) => {
  ctx.fillStyle = "#c08a22"; ctx.beginPath(); ctx.moveTo(-c * 0.55, c * 0.55); ctx.lineTo(-c * 0.55, -c * 0.15); ctx.arc(0, -c * 0.15, c * 0.55, Math.PI, TAU); ctx.lineTo(c * 0.55, c * 0.55); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#b5122e"; ctx.beginPath(); ctx.moveTo(-c * 0.44, c * 0.48); ctx.lineTo(-c * 0.44, -c * 0.12); ctx.arc(0, -c * 0.12, c * 0.44, Math.PI, TAU); ctx.lineTo(c * 0.44, c * 0.48); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#f2c94c";
  for (let i = 0; i < 18; i++) {
    const a = Math.PI + (i / 17) * Math.PI;
    ctx.beginPath(); ctx.arc(Math.cos(a) * c * 0.5, -c * 0.15 + Math.sin(a) * c * 0.5, c * 0.025, 0, TAU); ctx.fill();
  }
  ctx.strokeStyle = "#f2c94c"; ctx.lineWidth = c * 0.045; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(0, c * 0.38); ctx.lineTo(0, -c * 0.4); ctx.moveTo(-c * 0.18, -c * 0.3);
  ctx.quadraticCurveTo(-c * 0.18, -c * 0.08, 0, -c * 0.08); ctx.quadraticCurveTo(c * 0.18, -c * 0.08, c * 0.18, -c * 0.3); ctx.stroke();
  ctx.fillStyle = "#f2c94c"; ctx.beginPath(); ctx.moveTo(0, -c * 0.52); ctx.lineTo(-c * 0.05, -c * 0.38); ctx.lineTo(c * 0.05, -c * 0.38); ctx.fill();
  ctx.fillStyle = "#f28b1a";
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * 0.15 + (i / 8) * Math.PI * 0.7;
    ctx.beginPath(); ctx.arc(Math.cos(a) * c * 0.75, c * 0.15 + Math.sin(a) * c * 0.55, c * 0.06, 0, TAU); ctx.fill();
  }
  flame(ctx, 0, c * 0.66, c * 0.12, flick);
};

/** Carved wooden canopy seen from above. */
const mandvi: Draw = (ctx, { c, beat, flick }) => {
  ctx.save(); ctx.rotate(beat * 0.025);
  ctx.fillStyle = "#6b3a1c"; ctx.beginPath(); ctx.roundRect(-c * 0.62, -c * 0.62, c * 1.24, c * 1.24, c * 0.1); ctx.fill();
  ctx.fillStyle = "#b5122e"; ctx.beginPath(); ctx.roundRect(-c * 0.5, -c * 0.5, c, c, c * 0.06); ctx.fill();
  ctx.fillStyle = "#f2c94c";
  for (let i = 0; i < 16; i++) {
    const u = i / 16;
    for (const [x, y] of [[-0.56 + 1.12 * u, -0.56], [0.56, -0.56 + 1.12 * u], [0.56 - 1.12 * u, 0.56], [-0.56, 0.56 - 1.12 * u]]) {
      ctx.beginPath(); ctx.arc(x * c, y * c, c * 0.025, 0, TAU); ctx.fill();
    }
  }
  ctx.fillStyle = "#e2b44a";
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.beginPath(); ctx.arc(x * c * 0.5, y * c * 0.5, c * 0.09, 0, TAU); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, c * 0.26, 0, TAU); ctx.fill();
  ctx.restore();
  flame(ctx, 0, c * 0.02, c * 0.16, flick);
};

/** Centre pole with toran strings and marigold lights running to the edge. */
const pillar: Draw = (ctx, { c, outer, beat }) => {
  const n = 16, gap = c * 0.32;
  ctx.strokeStyle = "rgba(255,240,200,.35)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * outer * 1.05, Math.sin(a) * outer * 1.05);
  }
  ctx.stroke();
  // Lights step outward one place per beat: one path for lit lights, one for unlit.
  for (const lit of [false, true]) {
    ctx.fillStyle = lit ? "#ffd86b" : "#f28b1a";
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      for (let d = c * 0.6; d < outer; d += gap) {
        if ((mod(Math.floor(d / gap) + Math.floor(beat), 3) === 0) !== lit) continue;
        circle(ctx, Math.cos(a) * d, Math.sin(a) * d, c * (lit ? 0.045 : 0.035));
      }
    }
    ctx.fill();
  }
  ctx.fillStyle = "#e2b44a"; ctx.beginPath(); ctx.arc(0, 0, c * 0.32, 0, TAU); ctx.fill();
  ctx.fillStyle = "#b5122e"; ctx.beginPath(); ctx.arc(0, 0, c * 0.22, 0, TAU); ctx.fill();
  ctx.fillStyle = "#e2b44a"; ctx.beginPath(); ctx.arc(0, 0, c * 0.1, 0, TAU); ctx.fill();
};

/** Two dhol drums whose sticks strike on the beat. */
const dhol: Draw = (ctx, { c, beat }) => {
  ctx.fillStyle = "#5a0f1a"; ctx.beginPath(); ctx.arc(0, 0, c * 0.78, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#e2b44a"; ctx.lineWidth = c * 0.03; ctx.setLineDash([c * 0.06, c * 0.05]);
  ctx.beginPath(); ctx.arc(0, 0, c * 0.7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  for (const side of [-1, 1]) {
    ctx.save(); ctx.translate(side * c * 0.32, 0); ctx.rotate(side * 0.25);
    ctx.fillStyle = "#8a4b22"; ctx.beginPath(); ctx.roundRect(-c * 0.2, -c * 0.32, c * 0.4, c * 0.64, c * 0.08); ctx.fill();
    ctx.strokeStyle = "#f2ead2"; ctx.lineWidth = c * 0.015;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-c * 0.2, -c * 0.32 + i * c * 0.16); ctx.lineTo(c * 0.2, -c * 0.24 + i * c * 0.16); ctx.stroke(); }
    ctx.fillStyle = "#e9dcc0"; ctx.beginPath(); ctx.ellipse(0, -c * 0.32, c * 0.2, c * 0.06, 0, 0, TAU); ctx.fill();
    // Left stick strikes on the beat, right stick on the off-beat.
    const hit = bump(beat, side < 0 ? 0 : 0.5);
    ctx.strokeStyle = "#c48a3c"; ctx.lineWidth = c * 0.03;
    ctx.beginPath(); ctx.moveTo(c * 0.05, -c * 0.36); ctx.lineTo(c * 0.35, -c * 0.6 + hit * c * 0.22); ctx.stroke();
    ctx.restore();
  }
};

/** Layered petal mandala in the night's palette, slowly rotating. */
const rangoli: Draw = (ctx, { c, beat, flick, palette }) => {
  ctx.save(); ctx.rotate(beat * 0.04);
  const cols = [palette[0], palette[1], palette[2], "#fff6e2"];
  for (let layer = 3; layer >= 0; layer--) {
    const n = 8 + layer * 4, r = c * (0.25 + layer * 0.17);
    ctx.fillStyle = cols[layer % 4];
    for (let i = 0; i < n; i++) {
      ctx.save(); ctx.rotate((i / n) * TAU + layer * 0.2);
      ctx.beginPath(); ctx.ellipse(r * 0.75, 0, r * 0.3, r * (0.55 / (layer + 2)) + c * 0.03, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  ctx.fillStyle = "#fff6e2"; ctx.beginPath(); ctx.arc(0, 0, c * 0.18, 0, TAU); ctx.fill();
  ctx.restore();
  flame(ctx, 0, c * 0.03, c * 0.12, flick);
};

const CENTREPIECES: Record<CentreId, Draw> = { garbo, jyot, mataji, mandvi, pillar, dhol, rangoli };

export function drawCentre(ctx: CanvasRenderingContext2D, id: CentreId, args: CentreArgs) {
  CENTREPIECES[id](ctx, args);
}
