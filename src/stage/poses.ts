import type { StepId } from "../state/types";
import { TAU, gauss as G } from "../util/math";

/** A dancer's pose in local units (1 = dancer size). Renderer-agnostic so a 2.5D view can reuse it. */
export interface Pose {
  arms: number; // 0 = down/out, 1 = raised together (clap)
  flare: number; // ghagra / kediyu flare
  selfRot: number; // spin about own axis, radians
  radial: number; // offset towards (−) or away from (+) the centre
  tang: number; // offset along the circle
  sway: number; // body tilt, radians
  squash: number; // vertical squash for hops
  flash: number; // clap spark strength 0–1
  stick: boolean; // holding dandiya sticks
}

const REST: Pose = { arms: 0.2, flare: 1, selfRot: 0, radial: 0, tang: 0, sway: 0, squash: 1, flash: 0, stick: false };

/** Pure function of (step, beat position within the step, dancer index). */
export function pose(step: StepId | null, lb: number, j: number): Pose {
  const p = { ...REST };
  const f = lb % 1;
  switch (step) {
    case "be": {
      const c = lb % 4;
      p.arms = 0.15 + 0.85 * Math.max(G(c, 2), G(c, 3));
      p.flash = Math.max(G(c, 2, 0.05), G(c, 3, 0.05));
      p.sway = 0.28 * Math.sin((c / 4) * TAU);
      p.radial = 0.03 * Math.sin(Math.PI * f);
      break;
    }
    case "tran": {
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
      p.stick = true;
      break;
    }
  }
  return p;
}

export function blendPose(a: Pose, b: Pose, t: number): Pose {
  const mix = (x: number, y: number) => x + (y - x) * t;
  return {
    arms: mix(a.arms, b.arms),
    flare: mix(a.flare, b.flare),
    selfRot: mix(a.selfRot, b.selfRot),
    radial: mix(a.radial, b.radial),
    tang: mix(a.tang, b.tang),
    sway: mix(a.sway, b.sway),
    squash: mix(a.squash, b.squash),
    flash: mix(a.flash, b.flash),
    stick: t > 0.5 ? b.stick : a.stick,
  };
}
