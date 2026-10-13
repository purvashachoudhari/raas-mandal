import { FPS } from "./onset";

export const MIN_BPM = 70;
export const MAX_BPM = 200;
const PRIOR_BPM = 120;
const PRIOR_OCTAVES = 1; // log-Gaussian width
const WINDOW_S = 8;
const HOP_S = 2;
/** Local tempo may drift this far from the song's main tempo (garba speeds up, but never changes octave). */
const LOCAL_RANGE: [number, number] = [0.75, 1.35];

const lagOf = (bpm: number) => (60 * FPS) / bpm;
export const prior = (bpm: number) => Math.exp(-0.5 * (Math.log2(bpm / PRIOR_BPM) / PRIOR_OCTAVES) ** 2);

/** Unbiased, mean-removed autocorrelation of env[start, end), normalised so lag 0 = 1. */
function autocorrelation(env: Float32Array, start: number, end: number, maxLag: number): Float64Array {
  const n = end - start;
  let mean = 0;
  for (let i = start; i < end; i++) mean += env[i];
  mean /= n || 1;
  const acf = new Float64Array(Math.min(maxLag, n - 1) + 1);
  for (let lag = 0; lag < acf.length; lag++) {
    let s = 0;
    for (let i = start; i < end - lag; i++) s += (env[i] - mean) * (env[i + lag] - mean);
    acf[lag] = s / (n - lag);
  }
  const a0 = acf[0] || 1;
  for (let lag = 0; lag < acf.length; lag++) acf[lag] /= a0;
  return acf;
}

function acfAt(acf: Float64Array, lag: number): number {
  const i = Math.floor(lag);
  if (i + 1 >= acf.length) return 0;
  const f = lag - i;
  return acf[i] * (1 - f) + acf[i + 1] * f;
}

/**
 * How well a beat period explains the rhythm: autocorrelation at the period and its multiples
 * (2T, 3T, 4T), so a true beat that repeats in bars outscores a stray off-beat lag.
 */
function periodScore(acf: Float64Array, lag: number): number {
  let s = 0, w = 0;
  for (let k = 1; k <= 4; k++) {
    if (k * lag >= acf.length - 1) break;
    s += Math.max(0, acfAt(acf, k * lag)) / k;
    w += 1 / k;
  }
  return w ? s / w : 0;
}

function bestTempo(acf: Float64Array, lo: number, hi: number, weight: (bpm: number) => number): { bpm: number; score: number } {
  let best = { bpm: (lo + hi) / 2, score: -1 };
  for (let bpm = lo; bpm <= hi; bpm += 0.25) {
    const s = periodScore(acf, lagOf(bpm)) * weight(bpm);
    if (s > best.score) best = { bpm, score: s };
  }
  return best;
}

export interface TempoCurve {
  /** Main tempo of the whole song. */
  bpm: number;
  /** Local tempo at window centres, smoothed. */
  curve: { t: number; bpm: number }[];
}

const maxLagFrames = () => Math.ceil(lagOf(MIN_BPM / 1.5) * 4);

/**
 * Tempo candidates for the whole clip: the strongest autocorrelation peaks between 70 and 200 bpm
 * (weighted by the 120 bpm prior) plus each one's octave relatives T, 2T, T/2 and 2T/3 / 3T/2
 * (garba often has a 6/8 feel). The pipeline picks between them by tracking beats for each and
 * scoring how well those beats line up with the onsets.
 */
export function tempoCandidates(env: Float32Array, peaks = 3): number[] {
  const acf = autocorrelation(env, 0, env.length, maxLagFrames());
  const grid: { bpm: number; s: number }[] = [];
  for (let bpm = MIN_BPM; bpm <= MAX_BPM; bpm += 0.25) grid.push({ bpm, s: periodScore(acf, lagOf(bpm)) * prior(bpm) });
  const tops = grid
    .filter((g, i) => i > 0 && i < grid.length - 1 && g.s >= grid[i - 1].s && g.s >= grid[i + 1].s && g.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, peaks)
    .map((g) => g.bpm);
  if (!tops.length) tops.push(PRIOR_BPM);

  const out: number[] = [];
  for (const base of tops) {
    for (const c of [base, base / 2, base * 2, base * 1.5, base / 1.5]) {
      if (c < MIN_BPM || c > MAX_BPM) continue;
      // Refine each candidate to its own autocorrelation peak (±4%, no prior).
      const refined = bestTempo(acf, c * 0.96, c * 1.04, () => 1).bpm;
      if (!out.some((o) => Math.abs(o / refined - 1) < 0.03)) out.push(refined);
    }
  }
  return out;
}

/** Windowed autocorrelations depend only on the envelope, so compute them once and share across candidates. */
const acfCache = new WeakMap<Float32Array, { t: number; acf: Float64Array }[]>();
function localAcfs(env: Float32Array) {
  let list = acfCache.get(env);
  if (!list) {
    const win = Math.round(WINDOW_S * FPS), hop = Math.round(HOP_S * FPS);
    list = [];
    for (let start = 0; start + win <= env.length; start += hop) {
      list.push({ t: (start + win / 2) / FPS, acf: autocorrelation(env, start, start + win, maxLagFrames()) });
    }
    acfCache.set(env, list);
  }
  return list;
}

/** Window-to-window tempo change allowed per 2 s hop, in octaves (≈ 3%): speed-ups rise steadily. */
const STEP_OCTAVES = 0.04;

/**
 * Local tempo curve around a chosen main tempo. Each 8 s window (2 s hop) scores every tempo within
 * 0.75–1.35× the main tempo; a Viterbi pass then finds the smoothest high-scoring path, so the curve
 * follows real speed-ups without jumping between rhythmic levels. Clips shorter than two windows
 * don't hold enough audio for a meaningful curve, so they keep the main tempo throughout.
 */
export function tempoCurve(env: Float32Array, bpm: number): TempoCurve {
  if (env.length < 2 * Math.round(WINDOW_S * FPS)) return { bpm, curve: [{ t: 0, bpm }] };

  const states: number[] = [];
  for (let b = bpm * LOCAL_RANGE[0]; b <= bpm * LOCAL_RANGE[1]; b *= 1.005) states.push(b);
  const windows = localAcfs(env).map(({ t, acf }) => {
    const raw = Float64Array.from(states, (b) => periodScore(acf, lagOf(b)));
    const max = Math.max(1e-9, ...raw);
    return { t, score: raw.map((v) => Math.log(1e-3 + v / max)) };
  });

  // Viterbi: log score per window plus a Gaussian penalty on tempo change between windows.
  const S = states.length;
  let acc = Float64Array.from(windows[0].score, (v, j) => v - 0.5 * (Math.log2(states[j] / bpm) / 0.2) ** 2);
  const back: Int32Array[] = [];
  for (let w = 1; w < windows.length; w++) {
    const next = new Float64Array(S), bp = new Int32Array(S);
    for (let j = 0; j < S; j++) {
      let best = -Infinity, arg = 0;
      for (let i = 0; i < S; i++) {
        const v = acc[i] - 0.5 * (Math.log2(states[j] / states[i]) / STEP_OCTAVES) ** 2;
        if (v > best) { best = v; arg = i; }
      }
      next[j] = best + windows[w].score[j];
      bp[j] = arg;
    }
    back.push(bp);
    acc = next;
  }
  let j = acc.indexOf(Math.max(...acc));
  const path = [j];
  for (let w = back.length - 1; w >= 0; w--) path.unshift((j = back[w][j]));
  return { bpm, curve: windows.map((w, i) => ({ t: w.t, bpm: states[path[i]] })) };
}

/** Beat period in frames at time t, interpolated along the curve. */
export function periodAt(curve: TempoCurve["curve"], t: number): number {
  if (curve.length === 1 || t <= curve[0].t) return lagOf(curve[0].bpm);
  for (let i = 1; i < curve.length; i++) {
    if (t <= curve[i].t) {
      const f = (t - curve[i - 1].t) / (curve[i].t - curve[i - 1].t);
      return lagOf(curve[i - 1].bpm + f * (curve[i].bpm - curve[i - 1].bpm));
    }
  }
  return lagOf(curve[curve.length - 1].bpm);
}
