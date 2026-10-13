import type { NightTheme } from "../../data/nights";
import type { PrintId } from "../../state/types";
import { luminance, mix } from "../../util/color";
import { abhlaTile } from "./abhla";
import { ajrakhTile } from "./ajrakh";
import { bandhaniTile } from "./bandhani";
import type { PrintColours, TileFn } from "./common";
import { patolaTile } from "./patola";

export type { PrintColours } from "./common";

export const TILES: Record<PrintId, TileFn> = {
  bandhani: bandhaniTile,
  patola: patolaTile,
  ajrakh: ajrakhTile,
  abhla: abhlaTile,
};

/** Tile size as a fraction of dancer size, tuned so each print reads at the smallest dancers (5 circles). */
export const TILE_SCALE: Record<PrintId, number> = {
  bandhani: 0.26,
  patola: 0.36,
  ajrakh: 0.32,
  abhla: 0.32,
};

/** Smallest tile, in device px, before motifs blur into noise. */
const MIN_TILE_PX = 12;

export function tilePx(print: PrintId, dancerSize: number, dpr: number): number {
  return Math.max(MIN_TILE_PX, Math.round(dancerSize * TILE_SCALE[print] * dpr));
}

/** Print colours for a garment: the night's accent and off-white on the garment colour. */
export function printColours(ground: string, theme: NightTheme): PrintColours {
  const light = luminance(ground) > 0.8;
  return {
    ground,
    motif: theme.accent,
    // Off-white disappears on a white garment, so use the night's deep ground instead.
    cream: light ? theme.bg : theme.cream,
    deep: mix(ground, "#170B07", light ? 0.55 : 0.72),
  };
}

/** Print fills cached per print × colours × tile size. */
export class PatternCache {
  private cache = new Map<string, CanvasPattern | string>();

  clear() {
    this.cache.clear();
  }

  /** `size` is the tile size in device pixels; the pattern is scaled back to CSS px by `dpr`. */
  get(ctx: CanvasRenderingContext2D, print: PrintId, colours: PrintColours, size: number, dpr: number): CanvasPattern | string {
    const key = `${print}|${colours.ground}|${colours.motif}|${colours.cream}|${size}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const pattern = ctx.createPattern(TILES[print](colours, size), "repeat");
    pattern?.setTransform(new DOMMatrix().scale(1 / dpr));
    const fill = pattern ?? colours.ground;
    this.cache.set(key, fill);
    return fill;
  }
}
