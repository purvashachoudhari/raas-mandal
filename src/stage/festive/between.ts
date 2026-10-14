import type { NightTheme } from "../../data/nights";
import type { DecorId } from "../../state/types";
import { TAU } from "../../util/math";
import { flash, flicker, mod } from "../pulse";
import { circle, oval } from "../shapes";

// Between-circle decorations, drawn in the decoration lanes the layout keeps free of dancers.
// Each draws a full ring centred on radius r, staying within w/2 of it. Shapes of one colour are
// batched into a single path, so a whole ring costs a handful of draw calls.

interface DecorArgs {
  r: number;
  w: number;
  beat: number;
  /** Flame flicker phase (see CentreArgs.flick). */
  flick: number;
  theme: NightTheme;
}

type Draw = (ctx: CanvasRenderingContext2D, a: DecorArgs) => void;

/** Evenly spaced positions round the ring, about `spacing` apart. */
function ring(r: number, spacing: number): { x: number; y: number; a: number }[] {
  const n = Math.max(8, Math.floor((TAU * r) / spacing));
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, a };
  });
}

function fillAll(ctx: CanvasRenderingContext2D, colour: string, add: () => void) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  add();
  ctx.fill();
}

/** Row of clay diyas whose flames brighten on every beat. */
const diyas: Draw = (ctx, { r, w, beat, flick }) => {
  const pts = ring(r, w * 1.5);
  const glow = 0.55 + 0.45 * flash(beat, 0.18);
  const f = pts.map((_, i) => flicker(flick, i) * w * 0.13);
  fillAll(ctx, "#8f3b1c", () => pts.forEach((p) => oval(ctx, p.x, p.y, w * 0.3, w * 0.42, p.a)));
  fillAll(ctx, "#c2602e", () => pts.forEach((p) => oval(ctx, p.x, p.y, w * 0.21, w * 0.32, p.a)));
  fillAll(ctx, `rgba(255,190,80,${0.35 * glow})`, () => pts.forEach((p, i) => circle(ctx, p.x, p.y, f[i] * 2.6)));
  fillAll(ctx, "#ffb627", () => pts.forEach((p, i) => circle(ctx, p.x, p.y, f[i] * 1.2)));
  fillAll(ctx, `rgba(255,246,200,${glow})`, () => pts.forEach((p, i) => circle(ctx, p.x, p.y, f[i] * 0.6)));
};

/** Marigold garland: orange and yellow flower heads with a pair of leaves every few flowers. */
const garland: Draw = (ctx, { r, w }) => {
  const spacing = w * 0.5;
  fillAll(ctx, "#3d8b37", () => {
    for (const { x, y, a } of ring(r, spacing * 8)) {
      for (const side of [-1, 1]) oval(ctx, x + Math.cos(a) * side * w * 0.3, y + Math.sin(a) * side * w * 0.3, w * 0.24, w * 0.1, a);
    }
  });
  const heads = ring(r, spacing);
  for (const [parity, petal, heart] of [[0, "#f07a1a", "#c95a10"], [1, "#f5b324", "#e0961a"]] as const) {
    fillAll(ctx, petal, () => heads.forEach((p, i) => { if (i % 2 === parity) circle(ctx, p.x, p.y, w * 0.27); }));
    fillAll(ctx, heart, () => heads.forEach((p, i) => { if (i % 2 === parity) circle(ctx, p.x, p.y, w * 0.1); }));
  }
};

/** String lights on a wavy wire, chasing round the ring on every half-beat. */
const lights: Draw = (ctx, { r, w, beat, theme }) => {
  const n = Math.max(8, Math.floor((TAU * r) / (w * 0.9)));
  ctx.strokeStyle = "rgba(30,20,12,.6)";
  ctx.lineWidth = Math.max(1, w * 0.05);
  ctx.beginPath();
  for (let k = 0; k <= n * 6; k++) {
    const a = (k / (n * 6)) * TAU;
    const rr = r + w * 0.18 * Math.sin((k / 6) * Math.PI);
    if (k) ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.stroke();

  const colours = [theme.accent, theme.cream, theme.wearLight, "#ff6b5b"];
  const chase = Math.floor(beat * 2);
  const bulb = (i: number) => ({ x: Math.cos((i / n) * TAU) * r, y: Math.sin((i / n) * TAU) * r });
  const isLit = (i: number) => mod(i - chase, 4) === 0;
  fillAll(ctx, "rgba(255,240,190,.35)", () => { for (let i = 0; i < n; i++) if (isLit(i)) { const b = bulb(i); circle(ctx, b.x, b.y, w * 0.34); } });
  for (const lit of [false, true]) {
    ctx.globalAlpha = lit ? 1 : 0.4;
    colours.forEach((colour, c) =>
      fillAll(ctx, colour, () => {
        for (let i = c; i < n; i += colours.length) if (isLit(i) === lit) { const b = bulb(i); circle(ctx, b.x, b.y, w * (lit ? 0.17 : 0.13)); }
      }),
    );
  }
  ctx.globalAlpha = 1;
};

/** Rangoli border: dotted edges with alternating petals and dots in the night's palette. */
const rangoliBorder: Draw = (ctx, { r, w, theme }) => {
  const motifs = ring(r, w * 0.7);
  fillAll(ctx, theme.cream, () => {
    for (const edge of [-0.42, 0.42]) for (const p of ring(r + edge * w, w * 0.32)) circle(ctx, p.x, p.y, w * 0.05);
  });
  fillAll(ctx, theme.accent, () => motifs.forEach((p, i) => { if (i % 2) oval(ctx, p.x, p.y, w * 0.3, w * 0.13, p.a); }));
  fillAll(ctx, theme.wear, () =>
    motifs.forEach((p, i) => {
      if (i % 2) oval(ctx, p.x, p.y, w * 0.14, w * 0.06, p.a);
      else circle(ctx, p.x, p.y, w * 0.12);
    }),
  );
  // Off-white hearts sit on top of the wear-coloured dots.
  fillAll(ctx, theme.cream, () => motifs.forEach((p, i) => { if (i % 2 === 0) circle(ctx, p.x, p.y, w * 0.05); }));
};

const DECOR: Record<DecorId, Draw> = { diyas, garland, lights, rangoliBorder };

/**
 * Draw the selected decorations in the lanes. With as many lanes as decorations or more, the
 * decorations repeat across lanes in turn; with fewer lanes, a lane is shared by splitting it.
 */
export function drawBetween(ctx: CanvasRenderingContext2D, ids: readonly DecorId[], lanes: readonly { r: number; w: number }[], beat: number, flick: number, theme: NightTheme) {
  if (!ids.length || !lanes.length) return;
  lanes.forEach((lane, li) => {
    const here = ids.length <= lanes.length ? [ids[li % ids.length]] : ids.filter((_, j) => j % lanes.length === li);
    const sub = lane.w / here.length;
    here.forEach((id, k) => DECOR[id](ctx, { r: lane.r - lane.w / 2 + sub * (k + 0.5), w: sub, beat, flick, theme }));
  });
}
