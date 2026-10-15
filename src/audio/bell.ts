// A soft temple bell (ghanti), synthesized with Web Audio: a few inharmonic partials, struck together
// and ringing down at different rates, as a real bell's do. No audio files.

/** Partials as [frequency ratio, loudness, ring time in seconds]. */
const PARTIALS: readonly [number, number, number][] = [
  [0.5, 0.35, 3.2], // hum
  [1, 1, 2.6], // strike note
  [2.0, 0.45, 1.8],
  [2.76, 0.3, 1.3],
  [5.4, 0.14, 0.7],
  [8.93, 0.07, 0.4],
];
const PITCH = 660; // Hz
const VOLUME = 0.16;

/** Ring the bell once. Call from a user gesture (a click), so the browser lets audio start. */
export function ringBell() {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }
  const now = ctx.currentTime + 0.01;
  const master = ctx.createGain();
  master.gain.value = VOLUME;
  master.connect(ctx.destination);
  let longest = 0;
  for (const [ratio, level, ring] of PARTIALS) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = PITCH * ratio;
    // A slight detune on the main note gives the bell's gentle beating shimmer.
    if (ratio === 1) osc.detune.value = 4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(level, now + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, now + ring);
    osc.connect(g).connect(master);
    osc.start(now);
    osc.stop(now + ring + 0.05);
    longest = Math.max(longest, ring);
  }
  // Free the audio context once the bell has rung out.
  window.setTimeout(() => void ctx.close().catch(() => {}), (longest + 0.3) * 1000);
}
