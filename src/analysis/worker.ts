/// <reference lib="webworker" />
// Runs the beat analysis pipeline off the main thread so the UI stays responsive.
import { analyse } from "./pipeline";

export type WorkerRequest = { samples: Float32Array };
export type WorkerMessage =
  | { type: "progress"; fraction: number }
  | { type: "done"; map: ReturnType<typeof analyse> }
  | { type: "error"; message: string };

const post = (m: WorkerMessage) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  try {
    let last = -1;
    const map = analyse(e.data.samples, (fraction) => {
      // Progress at least every 5%.
      if (fraction - last >= 0.05 || fraction === 1) {
        last = fraction;
        post({ type: "progress", fraction });
      }
    });
    post({ type: "done", map });
  } catch (err) {
    post({ type: "error", message: (err as Error).message });
  }
};
