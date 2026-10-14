import { TAU } from "../util/math";

export interface StageLayout {
  /** Half the usable stage size. */
  half: number;
  /** Radius of the open centre where the centrepiece sits. */
  inner: number;
  /** Radius of the outermost circle's edge. */
  outer: number;
  /** Dancer size (1 local unit) in CSS px. */
  size: number;
  radii: number[];
  /** Dancers per circle: by circumference, always even (for Alternate and Dandiya pairs). */
  counts: number[];
  /**
   * Decoration lanes (only when decor is on): one inside each circle, i.e. between the centrepiece
   * and the first circle, then between each pair of circles. Dancers never enter them.
   */
  lanes: { r: number; w: number }[];
  /** "Into the centre & out": how far each circle steps in at the deepest point (CSS px). */
  gatherIn: number[];
}

/** How far a dancer reaches towards the centre from its circle line (× size). */
const DANCER_INNER = 0.47;
/** Closest two circle lines may come while gathering in (× size): a dancer's depth plus half a dancer's width. */
const GATHER_MIN_SPACING = 1.16;

/** Radial room one circle of dancers needs (× size): head, raised arms, flared ghagra, hops and spins. */
const DANCER_BAND = 1.24;
/** Width of a decoration lane (× size). */
const LANE = 0.3;

/** Edge lights sit on the rim at `half`; the lit ones have this radius (× half), so the ground reaches 1 + this. */
export const EDGE_LIGHT_RADIUS = 0.012;
/** Play mode keeps this fraction of the screen's shorter side free on every side. */
const PLAY_MARGIN = 0.04;

export function computeLayout(width: number, height: number, circleCount: number, playMode: boolean, decor = false): StageLayout {
  const short = Math.min(width, height);
  // Play mode fits the whole ground, edge lights included, inside the margin.
  const half = playMode ? (short * (0.5 - PLAY_MARGIN)) / (1 + EDGE_LIGHT_RADIUS) : (short / 2) * 0.94;
  const inner = half * 0.24;
  const k = circleCount;
  let outer = half * 0.9;
  let size: number;
  const radii: number[] = [];
  const lanes: StageLayout["lanes"] = [];

  if (!decor) {
    // Circles packed close; neighbouring circles' arms may interleave.
    size = Math.min(half * 0.2, ((outer - inner) / k) * 1.05);
    if (k === 1) radii.push((inner + outer) / 2);
    else for (let i = 0; i < k; i++) radii.push(inner + size * 0.55 + (i * (outer - inner - size * 1.1)) / (k - 1));
  } else {
    // Each circle gets a full dancer band plus a decoration lane inside it, so decor never overlaps
    // dancers. That needs more room, so the ground uses a little more of the stage and dancers shrink.
    outer = half * 0.95;
    const start = inner * 1.07; // clear of the twinkling lights around the centrepiece
    const avail = outer - start;
    size = Math.min(half * 0.2, avail / (k * (DANCER_BAND + LANE)));
    const band = DANCER_BAND * size, lane = LANE * size;
    const offset = start + (avail - k * (band + lane)) / 2; // centre the rings if size was capped
    for (let i = 0; i < k; i++) {
      const laneStart = offset + i * (band + lane);
      lanes.push({ r: laneStart + lane / 2, w: lane });
      radii.push(laneStart + lane + band / 2);
    }
  }

  const counts = radii.map((r) => {
    const n = Math.max(6, Math.floor((TAU * r) / (size * 0.66)));
    return n % 2 ? n - 1 : n;
  });

  // Into the centre & out: the inner circle steps in until its dancers reach the centrepiece's edge
  // (at most about one dancer, and at most a fifth of its radius so it doesn't crowd). Each outer
  // circle moves the same amount plus any room beyond GATHER_MIN_SPACING to the circle inside it,
  // so outer circles move more and circles never come closer together than that (or than at rest).
  const centreEdge = inner * 0.62 * 0.85 + (DANCER_INNER + 0.08) * size;
  const gatherIn: number[] = [];
  radii.forEach((r, i) => {
    if (i === 0) gatherIn.push(Math.max(0, Math.min(r - centreEdge, 0.9 * size, 0.2 * r)));
    else gatherIn.push(gatherIn[i - 1] + Math.max(0, r - radii[i - 1] - GATHER_MIN_SPACING * size));
  });

  return { half, inner, outer, size, radii, counts, lanes, gatherIn };
}
