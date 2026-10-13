import { TAU } from "../../util/math";
import { newTile, type PrintColours } from "./common";

/**
 * Bandhani (Kutch, Jamnagar): tie-dye dot clusters, four dots around a darker centre,
 * in an offset grid. Clusters alternate off-white and accent.
 */
export function bandhaniTile(c: PrintColours, T: number): HTMLCanvasElement {
  const [canvas, g] = newTile(T, c.ground);
  const o = T * 0.12, r = T * 0.075;

  const cluster = (cx: number, cy: number, dot: string) => {
    g.fillStyle = dot;
    for (const [dx, dy] of [[o, 0], [-o, 0], [0, o], [0, -o]]) {
      g.beginPath(); g.arc(cx + dx, cy + dy, r, 0, TAU); g.fill();
    }
    g.fillStyle = c.deep;
    g.beginPath(); g.arc(cx, cy, r * 0.8, 0, TAU); g.fill();
  };

  cluster(T * 0.25, T * 0.25, c.cream);
  cluster(T * 0.75, T * 0.75, c.motif);
  return canvas;
}
