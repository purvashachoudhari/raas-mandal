import { FFT } from "./fft";

export const SAMPLE_RATE = 22050;
export const WIN = 1024;
export const HOP = 256; // ≈ 11.6 ms
export const FPS = SAMPLE_RATE / HOP;
const N_MELS = 40;
const LOW_HZ = 150; // dhol bass stroke band
const TOP_DB = 80;

export interface Onsets {
  /** Onset strength per frame: half-wave-rectified mel spectral flux, summed across bands. */
  env: Float32Array;
  /** Same, for the band below 150 Hz only (the dhol's bass stroke). */
  low: Float32Array;
  /** Time in seconds of frame t is t / FPS + t0. */
  t0: number;
}

const hzToMel = (f: number) => 2595 * Math.log10(1 + f / 700);
const melToHz = (m: number) => 700 * (10 ** (m / 2595) - 1);

/** Triangular mel filters over the FFT bins, stored sparsely as [first bin, weights]. */
function melFilters(): { start: number; w: Float64Array }[] {
  const bins = WIN / 2 + 1;
  const maxMel = hzToMel(SAMPLE_RATE / 2);
  const edges = Array.from({ length: N_MELS + 2 }, (_, i) => melToHz((i / (N_MELS + 1)) * maxMel));
  const binHz = SAMPLE_RATE / WIN;
  return Array.from({ length: N_MELS }, (_, b) => {
    const [lo, mid, hi] = [edges[b], edges[b + 1], edges[b + 2]];
    const start = Math.max(0, Math.floor(lo / binHz));
    const end = Math.min(bins - 1, Math.ceil(hi / binHz));
    const w = new Float64Array(end - start + 1);
    for (let k = start; k <= end; k++) {
      const f = k * binHz;
      w[k - start] = f <= mid ? (f - lo) / (mid - lo || 1) : (hi - f) / (hi - mid || 1);
      if (w[k - start] < 0) w[k - start] = 0;
    }
    return { start, w };
  });
}

/** STFT (window 1024, hop 256) → 40-band mel log-magnitude → spectral flux, plus low-band flux. */
export function onsetStrength(x: Float32Array, onProgress?: (fraction: number) => void): Onsets {
  const nFrames = Math.max(2, 1 + Math.ceil(Math.max(0, x.length - WIN) / HOP));
  const fft = new FFT(WIN);
  const hann = new Float64Array(WIN).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / WIN));
  const filters = melFilters();
  const lowBins = Math.floor(LOW_HZ / (SAMPLE_RATE / WIN)); // bins 1..lowBins (skip DC)

  const melDb = new Float32Array(nFrames * N_MELS);
  const lowDb = new Float32Array(nFrames);
  const re = new Float64Array(WIN), im = new Float64Array(WIN), power = new Float64Array(WIN / 2 + 1);
  let maxDb = -Infinity;
  const progressEvery = Math.max(1, Math.floor(nFrames / 20));

  for (let t = 0; t < nFrames; t++) {
    const off = t * HOP;
    for (let i = 0; i < WIN; i++) {
      const s = off + i < x.length ? x[off + i] : 0;
      re[i] = s * hann[i];
      im[i] = 0;
    }
    fft.transform(re, im);
    for (let k = 0; k <= WIN / 2; k++) power[k] = re[k] * re[k] + im[k] * im[k];

    for (let b = 0; b < N_MELS; b++) {
      const { start, w } = filters[b];
      let e = 0;
      for (let k = 0; k < w.length; k++) e += w[k] * power[start + k];
      const db = 10 * Math.log10(e + 1e-10);
      melDb[t * N_MELS + b] = db;
      if (db > maxDb) maxDb = db;
    }
    let low = 0;
    for (let k = 1; k <= lowBins; k++) low += power[k];
    lowDb[t] = 10 * Math.log10(low + 1e-10);

    if (onProgress && t % progressEvery === 0) onProgress(t / nFrames);
  }

  // Clip to TOP_DB below the loudest point so silence doesn't produce noise flux.
  const floor = maxDb - TOP_DB;
  const env = new Float32Array(nFrames);
  const lowEnv = new Float32Array(nFrames);
  const lowFloor = Math.max(...lowDb) - TOP_DB;
  for (let t = 1; t < nFrames; t++) {
    let flux = 0;
    for (let b = 0; b < N_MELS; b++) {
      const d = Math.max(floor, melDb[t * N_MELS + b]) - Math.max(floor, melDb[(t - 1) * N_MELS + b]);
      if (d > 0) flux += d;
    }
    env[t] = flux / N_MELS;
    const dl = Math.max(lowFloor, lowDb[t]) - Math.max(lowFloor, lowDb[t - 1]);
    lowEnv[t] = dl > 0 ? dl : 0;
  }
  onProgress?.(1);
  // Flux at frame t is the change from t−1 to t: centred half a hop before frame t's centre.
  return { env, low: lowEnv, t0: (WIN / 2 - HOP / 2) / SAMPLE_RATE };
}
