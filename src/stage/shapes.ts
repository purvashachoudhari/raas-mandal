import { TAU } from "../util/math";

// Batching helpers: shapes that share a colour go into one path with one fill or stroke, which keeps
// draw calls low enough for integrated GPUs with ~220 dancers and every decoration on.

/** Add a full circle to the current path without joining it to the previous shape. */
export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arc(x, y, r, 0, TAU);
}

/** Add a full (rotated) ellipse to the current path without joining it to the previous shape. */
export function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot: number) {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
}
