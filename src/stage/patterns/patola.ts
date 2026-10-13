import { newTile, wrapped, type PrintColours } from "./common";

function diamond(g: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  g.beginPath();
  g.moveTo(cx, cy - r); g.lineTo(cx + r, cy); g.lineTo(cx, cy + r); g.lineTo(cx - r, cy);
  g.closePath();
}

/**
 * Patola (Patan): double-ikat diamond lattice with small diamonds in each cell.
 * The motif layer is copied in thin horizontal strips with small sideways shifts,
 * which gives the feathered, stepped edges of ikat dyeing.
 */
export function patolaTile(c: PrintColours, T: number): HTMLCanvasElement {
  const [canvas, g] = newTile(T, c.ground);

  const layer = document.createElement("canvas");
  layer.width = layer.height = T;
  const m = layer.getContext("2d")!;

  // Lattice through the edge midpoints: repeats into a continuous diamond grid.
  m.strokeStyle = c.motif;
  m.lineWidth = T * 0.11;
  m.lineJoin = "miter";
  wrapped(m, T, () => { diamond(m, T / 2, T / 2, T / 2); m.stroke(); });

  // Centre cell: off-white diamond with a deep heart.
  m.fillStyle = c.cream; diamond(m, T / 2, T / 2, T * 0.2); m.fill();
  m.fillStyle = c.deep; diamond(m, T / 2, T / 2, T * 0.07); m.fill();

  // Corner cells: deep diamond with an accent heart.
  wrapped(m, T, () => {
    m.fillStyle = c.deep; diamond(m, 0, 0, T * 0.17); m.fill();
    m.fillStyle = c.motif; diamond(m, 0, 0, T * 0.06); m.fill();
  });

  // Ikat feathering: shift each strip sideways by a small fixed amount.
  const strips = 12;
  for (let k = 0; k < strips; k++) {
    const y0 = Math.round((k * T) / strips), y1 = Math.round(((k + 1) * T) / strips);
    const dx = Math.round((((k * 7) % 5) - 2) * 0.014 * T);
    for (const off of [-T, 0, T]) g.drawImage(layer, 0, y0, T, y1 - y0, dx + off, y0, T, y1 - y0);
  }
  return canvas;
}
