import type { StepId } from "../state/types";
import { TAU, clamp, gauss as G } from "../util/math";

export type Prop = "dandiya" | "tippani" | null;

/** A dancer's pose in local units (1 = dancer size). Renderer-agnostic so a 2.5D view can reuse it. */
export interface Pose {
  arms: number; // 0 = down/out, 1 = raised together (clap)
  flare: number; // ghagra / kediyu flare
  selfRot: number; // spin about own axis, radians
  radial: number; // offset towards (−) or away from (+) the centre
  tang: number; // offset along the circle
  sway: number; // body tilt, radians
  squash: number; // vertical squash for hops
  scale: number; // whole-body scale (crouching)
  flash: number; // own clap spark strength (above 1 = a bigger spark)
  prop: Prop; // what the dancer is holding
  // Arm targets (0–1 blends away from the raised/lowered arms above):
  fwd: number; // hands forward and low, in front of the body
  armsSide: number; // −1…1, both hands swung to one side
  reach: number; // hands reaching to the partner
  reachX: number; // direction to the partner in local units (unit vector)
  reachY: number;
  // Tippani:
  strike: number; // 0–1, stick bent down onto the ground
  dust: number; // 0–1 time since the last strike (dust ring grows and fades), −1 for none
  // Pair moves:
  pairOffset: 0 | 1; // pairs are slots (2k + pairOffset, 2k + 1 + pairOffset)
  partnerClap: number; // spark strength between partners
  orbit: number; // partner swap: 0…π, half-turn around the point between partners
  // Whole-circle formation:
  gather: number; // 0–1, how far every circle has stepped in towards the centre
}

const REST: Pose = {
  arms: 0.2, flare: 1, selfRot: 0, radial: 0, tang: 0, sway: 0, squash: 1, scale: 1, flash: 0, prop: null,
  fwd: 0, armsSide: 0, reach: 0, reachX: 0, reachY: 0, strike: 0, dust: -1,
  pairOffset: 0, partnerClap: 0, orbit: 0, gather: 0,
};

const smooth = (x: number) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };

/** Which side a dancer's partner is on, along the circle: +1 = the next slot, −1 = the previous one. */
const partnerSide = (slot: number, offset: 0 | 1) => ((slot - offset) % 2 === 0 ? 1 : -1);

/**
 * Pure function of (step, beat position within the step, dancer slot). The slot is the dancer's
 * place on the circle, so pairs and facing follow positions (after a partner swap too).
 */
export function pose(step: StepId | null, lb: number, j: number): Pose {
  const p = { ...REST };
  const f = lb % 1;
  switch (step) {
    case "beTaali": {
      const c = lb % 4;
      p.arms = 0.15 + 0.85 * Math.max(G(c, 2), G(c, 3));
      p.flash = Math.max(G(c, 2, 0.05), G(c, 3, 0.05));
      p.sway = 0.28 * Math.sin((c / 4) * TAU);
      p.radial = 0.03 * Math.sin(Math.PI * f);
      break;
    }
    case "tranTaali": {
      const c = lb % 4;
      p.arms = 0.15 + 0.85 * Math.max(G(c, 2, 0.09), G(c, 2.5, 0.09), G(c, 3, 0.09));
      p.flash = Math.max(G(c, 2, 0.04), G(c, 2.5, 0.04), G(c, 3, 0.04));
      p.radial = -0.14 * G(c, 0.5, 0.3) + 0.1 * G(c, 1.4, 0.3);
      p.sway = 0.22 * Math.sin((c / 4) * TAU);
      break;
    }
    case "dodhiyu": {
      const hop = Math.sin(Math.PI * f);
      const side = Math.floor(lb) % 2 ? 1 : -1;
      p.radial = 0.09 * hop * side;
      p.arms = 0.5 + 0.5 * Math.cos(TAU * lb);
      p.flash = Math.max(G(f, 0, 0.05), G(f, 1, 0.05));
      p.squash = 1 - 0.1 * (1 - hop);
      p.sway = 0.38 * side * hop;
      p.flare = 1.12;
      break;
    }
    case "hinch": {
      const c = lb % 2;
      p.sway = 0.5 * Math.sin(Math.PI * c);
      p.tang = 0.08 * Math.sin(Math.PI * c);
      p.radial = 0.03 * Math.sin((TAU * c) / 2);
      p.arms = 0.3 + 0.6 * Math.max(G(c, 0, 0.14), G(c, 2, 0.14));
      p.flash = Math.max(G(c, 0, 0.05), G(c, 2, 0.05));
      p.flare = 1.08;
      break;
    }
    case "fudardi": {
      p.selfRot = (lb / 2) * TAU;
      p.flare = 1.55 + 0.1 * Math.sin(TAU * lb);
      p.arms = 0.02;
      break;
    }
    case "dandiya": {
      // Partners face each other and swap every bar.
      let s = j % 2 === 0 ? 1 : -1;
      if (Math.floor(lb / 4) % 2) s = -s;
      p.sway = s * 0.95;
      p.tang = s * 0.13;
      p.arms = 0.25 + 0.65 * G(f, 0.5, 0.12);
      p.flash = G(f, 0.5, 0.05);
      p.prop = "dandiya";
      break;
    }
    case "popatiyu": {
      // Parrot: crouch over beats 1–2, two low bobbing claps on 3–4, rise into the next downbeat.
      const c = lb % 4;
      const crouch = c < 0.6 ? smooth(c / 0.6) : c < 3.55 ? 1 : 1 - smooth((c - 3.55) / 0.45);
      const bob = G(c, 2, 0.09) + G(c, 3, 0.09);
      p.scale = 1 - 0.13 * crouch;
      p.flare = 1 + 0.32 * crouch;
      p.fwd = 0.9 * crouch;
      p.arms = 0;
      p.squash = 1 - 0.09 * bob;
      p.flash = Math.max(G(c, 2, 0.05), G(c, 3, 0.05));
      p.sway = 0.13 * (G(c, 2, 0.16) - G(c, 3, 0.16)); // head tilts one way, then the other
      break;
    }
    case "sanedo": {
      // Bounce on every beat; arms swing together side to side; a quick shoulder shake on each off-beat.
      const hop = Math.sin(Math.PI * f);
      const side = Math.cos(Math.PI * lb);
      p.squash = 1 - 0.07 * (1 - hop);
      p.radial = 0.04 * hop;
      p.arms = 0.55;
      p.armsSide = 0.9 * side;
      p.sway = 0.14 * side + 0.07 * Math.sin(TAU * 6 * lb) * G(f, 0.5, 0.1);
      p.flare = 1.06;
      break;
    }
    case "hudo": {
      // Pairs face each other. Beats 1 and 3: own claps. Beats 2 and 4: partners clap palms.
      // Partners switch sides every 2 bars (pairs shift by one place).
      const c = lb % 4;
      p.pairOffset = (Math.floor(lb / 8) % 2) as 0 | 1;
      const d = partnerSide(j, p.pairOffset);
      p.sway = -d * 0.95;
      p.reachX = d * Math.cos(p.sway);
      p.reachY = -d * Math.sin(p.sway);
      const own = Math.max(G(c, 0, 0.12), G(c, 2, 0.12), G(c, 4, 0.12));
      p.arms = 0.15 + 0.85 * own;
      p.flash = Math.max(G(c, 0, 0.05), G(c, 2, 0.05), G(c, 4, 0.05));
      p.reach = Math.max(G(c, 1, 0.14), G(c, 3, 0.14));
      p.partnerClap = Math.max(G(c, 1, 0.05), G(c, 3, 0.05));
      break;
    }
    case "tippani": {
      // Both hands on the stick; strike the ground in front on every beat, bending forward.
      const hit = G(f, 0, 0.1) + G(f, 1, 0.1);
      p.prop = "tippani";
      p.fwd = 1;
      p.arms = 0;
      p.strike = hit;
      p.radial = -0.06 * hit;
      p.squash = 1 - 0.05 * hit;
      p.dust = f;
      p.sway = 0.08 * Math.sin((Math.PI * lb) / 2);
      break;
    }
    case "centreInOut": {
      // Beats 1–4 step in with arms rising, big shared clap on 4; beats 5–8 step back out.
      const c = lb % 8;
      p.gather = c < 3 ? smooth(c / 3) : c < 4 ? 1 : 1 - smooth((c - 4) / 4);
      p.arms = 0.15 + 0.85 * p.gather;
      p.flash = 1.6 * G(c, 3, 0.07);
      break;
    }
    case "partnerSwap": {
      // Each pair orbits the point between them by half a turn over beats 1–3, clap on 4.
      const c = lb % 4;
      p.orbit = c < 3 ? Math.PI * smooth(c / 3) : Math.PI;
      const d = partnerSide(j, 0);
      p.sway = -d * 0.7 * Math.sin(Math.PI * clamp(c / 3, 0, 1));
      p.arms = 0.3 + 0.6 * G(c, 3, 0.12);
      p.flash = G(c, 3, 0.05);
      break;
    }
  }
  return p;
}

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const mix = (x: number, y: number) => x + (y - x) * t;
  const out = { ...(t > 0.5 ? b : a) };
  for (const k of Object.keys(a) as (keyof Pose)[]) {
    const va = a[k], vb = b[k];
    if (typeof va === "number" && typeof vb === "number" && k !== "pairOffset") (out as Record<string, unknown>)[k] = mix(va, vb);
  }
  return out;
}
