import { FPS } from "./onset";
import { periodAt, type TempoCurve } from "./tempo";

/** How strongly beats are held to the local period (Ellis 2007 / librosa use 100). */
const TIGHTNESS = 100;

/** Largest value of env within ±radius frames of a (possibly fractional) frame position. */
export function peakNear(env: Float32Array, frame: number, radius = 1): number {
  const c = Math.round(frame);
  let m = 0;
  for (let i = Math.max(0, c - radius); i <= Math.min(env.length - 1, c + radius); i++) if (env[i] > m) m = env[i];
  return m;
}

/**
 * Dynamic-programming beat tracker (Ellis 2007). Each frame's score is its onset strength plus the
 * best earlier beat's score, penalised by how far the gap strays from the local beat period, so the
 * beats follow the tempo curve through speed-ups. Returns beat positions in frames.
 */
export function trackBeats(env: Float32Array, curve: TempoCurve["curve"]): number[] {
  const n = env.length;
  if (n < 4) return [];
  let mean = 0, sq = 0;
  for (let i = 0; i < n; i++) { mean += env[i]; sq += env[i] * env[i]; }
  mean /= n;
  const std = Math.sqrt(Math.max(1e-12, sq / n - mean * mean));
  const o = Float64Array.from(env, (v) => v / std);

  const score = new Float64Array(n);
  const back = new Int32Array(n).fill(-1);
  const period = new Float64Array(n);
  for (let t = 0; t < n; t++) {
    const P = (period[t] = periodAt(curve, t / FPS));
    const lo = Math.max(0, Math.round(t - 2 * P)), hi = Math.round(t - P / 2);
    let best = -Infinity, arg = -1;
    for (let tau = lo; tau <= hi; tau++) {
      const s = score[tau] - TIGHTNESS * Math.log((t - tau) / P) ** 2;
      if (s > best) { best = s; arg = tau; }
    }
    score[t] = o[t] + (arg >= 0 && best > 0 ? best : 0);
    back[t] = arg >= 0 && best > 0 ? arg : -1;
  }

  // Last beat: the best-scoring frame within the final beat period.
  let last = n - 1;
  for (let t = Math.max(0, Math.floor(n - period[n - 1])); t < n; t++) if (score[t] > score[last]) last = t;
  const beats: number[] = [];
  for (let t = last; t >= 0; t = back[t]) beats.push(t);
  beats.reverse();

  // Trim weak beats at the edges (silence or fades), as librosa does.
  const rms = Math.sqrt(o.reduce((a, v) => a + v * v, 0) / n);
  const oF = Float32Array.from(o);
  const strong = (f: number) => peakNear(oF, f, 1) >= 0.5 * rms;
  let a = 0, b = beats.length;
  while (a < b && !strong(beats[a])) a++;
  while (b > a && !strong(beats[b - 1])) b--;
  return beats.slice(a, b);
}

/**
 * Confidence 0–1: mean onset strength on the beats relative to off-beat positions
 * (quarter, half and three-quarter way between beats). 0 = beats no stronger than off-beats.
 */
export function beatConfidence(env: Float32Array, beats: number[]): number {
  if (beats.length < 4) return 0;
  let on = 0, off = 0, nOff = 0;
  for (let i = 0; i < beats.length; i++) on += peakNear(env, beats[i]);
  on /= beats.length;
  for (let i = 0; i + 1 < beats.length; i++) {
    const gap = beats[i + 1] - beats[i];
    for (const f of [0.25, 0.5, 0.75]) { off += peakNear(env, beats[i] + f * gap); nOff++; }
  }
  off /= nOff || 1;
  return on > 0 ? Math.max(0, Math.min(1, 1 - off / on)) : 0;
}

/**
 * How well a beat grid explains the rhythm, for choosing between tempo candidates: the mean onset
 * strength on the beats (relative to the song's average) times the square root of the share of the
 * song's strong onsets that land on a beat. A grid at the wrong level either puts beats on weak
 * off-beats (lower salience) or skips strong onsets (lower coverage). Unlike beatConfidence, it
 * doesn't penalise the true beat for having strong off-beat strokes, which garba often has.
 */
export function gridScore(env: Float32Array, beats: number[]): number {
  if (beats.length < 4) return 0;
  let mean = 0, sq = 0;
  for (let i = 0; i < env.length; i++) { mean += env[i]; sq += env[i] * env[i]; }
  mean /= env.length;
  const std = Math.sqrt(Math.max(0, sq / env.length - mean * mean));
  let on = 0;
  for (const b of beats) on += peakNear(env, b);
  const salience = on / beats.length / (mean || 1);

  // Strong onsets: local maxima more than one standard deviation above the mean.
  const strong: number[] = [];
  for (let i = 1; i + 1 < env.length; i++) if (env[i] > mean + std && env[i] >= env[i - 1] && env[i] > env[i + 1]) strong.push(i);
  if (!strong.length) return salience;
  let covered = 0, j = 0;
  for (const f of strong) {
    while (j + 1 < beats.length && beats[j + 1] <= f) j++;
    const d = Math.min(Math.abs(f - beats[j]), j + 1 < beats.length ? Math.abs(beats[j + 1] - f) : Infinity);
    if (d <= 3) covered++;
  }
  return salience * Math.sqrt(covered / strong.length);
}

/** Bar phase whose beats carry the most low-band (dhol bass) energy: that beat is beat 1. */
export function downbeatPhase(low: Float32Array, beats: number[]): number {
  const sums = [0, 0, 0, 0], counts = [0, 0, 0, 0];
  beats.forEach((f, i) => { sums[i % 4] += peakNear(low, f, 2); counts[i % 4]++; });
  let best = 0;
  for (let p = 1; p < 4; p++) if (sums[p] / (counts[p] || 1) > sums[best] / (counts[best] || 1)) best = p;
  return best;
}

/** RMS loudness per beat, smoothed over 4 bars and normalised to 0–1. */
export function beatEnergy(samples: Float32Array, sampleRate: number, beatTimes: number[]): number[] {
  const raw = beatTimes.map((t, i) => {
    const end = i + 1 < beatTimes.length ? beatTimes[i + 1] : t + (beatTimes[i] - (beatTimes[i - 1] ?? t - 0.5));
    const a = Math.max(0, Math.floor(t * sampleRate)), b = Math.min(samples.length, Math.floor(end * sampleRate));
    let s = 0;
    for (let k = a; k < b; k++) s += samples[k] * samples[k];
    return Math.sqrt(s / Math.max(1, b - a));
  });
  const smooth = raw.map((_, i) => {
    const w = raw.slice(Math.max(0, i - 8), i + 8);
    return w.reduce((a, v) => a + v, 0) / (w.length || 1);
  });
  const max = Math.max(1e-9, ...smooth);
  return smooth.map((v) => v / max);
}
