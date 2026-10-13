import { TAU } from "../../util/math";
import { newTile, wrapped, type PrintColours } from "./common";

/**
 * Ajrakh (Kutch): block-print repeat of an eight-point star inside a trellis,
 * every shape edged with a dark resist outline.
 */
export function ajrakhTile(c: PrintColours, T: number): HTMLCanvasElement {
  const [canvas, g] = newTile(T, c.ground);
  const outline = T * 0.04;

  // Trellis on the tile edges, with off-white dots where the lines cross.
  g.strokeStyle = c.deep;
  g.lineWidth = T * 0.04;
  g.beginPath();
  g.moveTo(0, 0); g.lineTo(T, 0); g.moveTo(0, T); g.lineTo(T, T);
  g.moveTo(0, 0); g.lineTo(0, T); g.moveTo(T, 0); g.lineTo(T, T);
  g.stroke();
  wrapped(g, T, () => {
    g.fillStyle = c.cream;
    g.beginPath(); g.arc(0, 0, T * 0.06, 0, TAU); g.fill();
  });

  // Eight-point star: two overlapping squares.
  const R = T * 0.39, r = R * 0.72;
  g.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU - Math.PI / 2;
    const rad = i % 2 ? r : R;
    const x = T / 2 + Math.cos(a) * rad, y = T / 2 + Math.sin(a) * rad;
    if (i) g.lineTo(x, y); else g.moveTo(x, y);
  }
  g.closePath();
  g.fillStyle = c.motif; g.fill();
  g.strokeStyle = c.deep; g.lineWidth = outline; g.lineJoin = "round"; g.stroke();

  // Star centre.
  g.fillStyle = c.deep; g.beginPath(); g.arc(T / 2, T / 2, T * 0.11, 0, TAU); g.fill();
  g.fillStyle = c.cream; g.beginPath(); g.arc(T / 2, T / 2, T * 0.065, 0, TAU); g.fill();
  return canvas;
}
