/** Colours one print tile is drawn with. */
export interface PrintColours {
  /** Garment colour: the night's colour or one of its tonal variants. */
  ground: string;
  /** Main motif colour: the night's accent. */
  motif: string;
  /** Secondary motif colour: off-white, or a deep tone on very light garments. */
  cream: string;
  /** Dark outline / resist colour. */
  deep: string;
}

export type TileFn = (c: PrintColours, size: number) => HTMLCanvasElement;

/** A square tile canvas filled with the ground colour. */
export function newTile(size: number, ground: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  g.fillStyle = ground;
  g.fillRect(0, 0, size, size);
  return [canvas, g];
}

/** Draw a motif at its position and its wrapped copies, so shapes crossing an edge tile seamlessly. */
export function wrapped(g: CanvasRenderingContext2D, size: number, draw: () => void) {
  for (const dx of [-size, 0, size]) {
    for (const dy of [-size, 0, size]) {
      g.save();
      g.translate(dx, dy);
      draw();
      g.restore();
    }
  }
}
