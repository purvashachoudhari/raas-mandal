export const TAU = Math.PI * 2;

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Gaussian bump centred on c: used to shape claps, hops and pulses around a beat. */
export const gauss = (x: number, c: number, w = 0.12) => Math.exp(-((x - c) * (x - c)) / (2 * w * w));
