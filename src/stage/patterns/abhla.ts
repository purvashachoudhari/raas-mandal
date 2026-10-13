import { TAU } from "../../util/math";
import { newTile, type PrintColours } from "./common";

export const MIRROR = "#E4EAEE";
export const MIRROR_EDGE = "#9AA4AE";

/**
 * Abhla bharat (Kutch): all-over mirror work, round mirrors held by an accent stitch
 * ring, alternating with off-white stitched flowers. The embroidered border band
 * whose mirrors glint on the beat is drawn on the garment hem (see dancers.ts).
 */
export function abhlaTile(c: PrintColours, T: number): HTMLCanvasElement {
  const [canvas, g] = newTile(T, c.ground);

  const mirror = (x: number, y: number) => {
    g.fillStyle = c.motif; g.beginPath(); g.arc(x, y, T * 0.15, 0, TAU); g.fill();
    g.fillStyle = MIRROR; g.beginPath(); g.arc(x, y, T * 0.095, 0, TAU); g.fill();
    g.strokeStyle = MIRROR_EDGE; g.lineWidth = T * 0.02; g.stroke();
    g.fillStyle = "#FFFFFF"; g.beginPath(); g.arc(x - T * 0.03, y - T * 0.03, T * 0.03, 0, TAU); g.fill();
  };

  const flower = (x: number, y: number) => {
    g.fillStyle = c.cream;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      g.beginPath(); g.ellipse(x + Math.cos(a) * T * 0.07, y + Math.sin(a) * T * 0.07, T * 0.05, T * 0.03, a, 0, TAU); g.fill();
    }
    g.fillStyle = c.motif; g.beginPath(); g.arc(x, y, T * 0.03, 0, TAU); g.fill();
  };

  mirror(T * 0.25, T * 0.25);
  mirror(T * 0.75, T * 0.75);
  flower(T * 0.75, T * 0.25);
  flower(T * 0.25, T * 0.75);
  return canvas;
}
