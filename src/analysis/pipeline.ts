import type { BeatMap } from "../state/types";
import { beatConfidence, beatEnergy, downbeatPhase, gridScore, trackBeats } from "./beatTrack";
import { FPS, SAMPLE_RATE, onsetStrength } from "./onset";
import { prior, tempoCandidates, tempoCurve } from "./tempo";

function medianBpm(times: number[]): number | null {
  const intervals = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
  return intervals.length ? 60 / intervals[Math.floor(intervals.length / 2)] : null;
}

/** Bump to invalidate every cached BeatMap. */
export const ANALYSIS_VERSION = 2;

export interface CandidateReport {
  bpm: number;
  confidence: number;
  score: number;
}

/**
 * The full §8 pipeline on mono 22,050 Hz samples: onsets → tempo candidates → beats for each
 * candidate → keep the candidate whose beats best explain the onsets (gridScore, weighted towards
 * 120 bpm) → downbeats, energy, confidence.
 */
export function analyse(
  samples: Float32Array,
  onProgress: (fraction: number) => void = () => {},
  report?: (candidates: CandidateReport[]) => void,
): BeatMap {
  const onsets = onsetStrength(samples, (f) => onProgress(f * 0.7));
  const { env, low, t0 } = onsets;

  const candidates = tempoCandidates(env);
  onProgress(0.75);
  const tried = candidates.map((bpm, i) => {
    const curve = tempoCurve(env, bpm);
    const beats = trackBeats(env, curve.curve);
    const confidence = beatConfidence(env, beats);
    onProgress(0.75 + (0.2 * (i + 1)) / candidates.length);
    return { bpm, curve, beats, confidence, score: gridScore(env, beats) * prior(bpm) };
  });
  report?.(tried.map(({ bpm, confidence, score }) => ({ bpm, confidence, score })));
  let best = tried.reduce((a, b) => (b.score > a.score ? b : a));

  // If the beats settled on a different tempo than the candidate (e.g. 6/8 vs 4/4), track again
  // at the tempo they actually follow so the curve and the beats agree.
  const settled = medianBpm(best.beats.map((f) => f / FPS));
  if (settled && Math.abs(settled / best.bpm - 1) > 0.04) {
    const curve = tempoCurve(env, settled);
    const beats = trackBeats(env, curve.curve);
    const confidence = beatConfidence(env, beats);
    const score = gridScore(env, beats) * prior(settled);
    if (score >= best.score * 0.95) best = { bpm: settled, curve, beats, confidence, score };
  }

  const toTime = (f: number) => f / FPS + t0;
  const beats = best.beats.map(toTime);
  const phase = downbeatPhase(low, best.beats);
  const downbeats = beats.filter((_, i) => i % 4 === phase);

  const bpm = medianBpm(beats) ?? best.bpm;

  // Tempo curve from the tracked beats (what the dancers actually follow), every ~2 s.
  const tempoCurvePts: BeatMap["tempoCurve"] = [];
  for (let i = 0; i + 8 < beats.length; i += 4) {
    const span = beats[i + 8] - beats[i];
    if (!tempoCurvePts.length || beats[i] - tempoCurvePts[tempoCurvePts.length - 1].t >= 2) {
      tempoCurvePts.push({ t: Math.round(beats[i] * 1000) / 1000, bpm: Math.round((8 * 600) / span) / 10 });
    }
  }
  if (!tempoCurvePts.length) tempoCurvePts.push({ t: beats[0] ?? 0, bpm: Math.round(bpm * 10) / 10 });

  const energy = beatEnergy(samples, SAMPLE_RATE, beats);
  onProgress(1);
  return {
    beats: beats.map((t) => Math.round(t * 1000) / 1000),
    downbeats: downbeats.map((t) => Math.round(t * 1000) / 1000),
    tempoCurve: tempoCurvePts,
    bpm: Math.round(bpm * 10) / 10,
    confidence: Math.round(best.confidence * 100) / 100,
    energy: energy.map((e) => Math.round(e * 1000) / 1000),
    version: ANALYSIS_VERSION,
  };
}
