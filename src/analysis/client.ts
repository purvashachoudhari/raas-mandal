import type { BeatMap } from "../state/types";
import { SAMPLE_RATE } from "./onset";
import type { WorkerMessage } from "./worker";

/** Mix to mono and resample to 22,050 Hz (Web Audio does both while rendering). */
export async function prepareSamples(buffer: AudioBuffer): Promise<Float32Array> {
  const length = Math.max(1, Math.ceil(buffer.duration * SAMPLE_RATE));
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
  return (await ctx.startRendering()).getChannelData(0);
}

export interface AnalysisJob {
  result: Promise<BeatMap>;
  cancel(): void;
}

/** Run the pipeline in a Web Worker, reporting progress 0–1. */
export function runAnalysis(samples: Float32Array, onProgress: (fraction: number) => void): AnalysisJob {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  let settle: { reject(e: Error): void } | null = null;
  const result = new Promise<BeatMap>((resolve, reject) => {
    settle = { reject };
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === "progress") onProgress(m.fraction);
      else {
        worker.terminate();
        if (m.type === "done") resolve(m.map);
        else reject(new Error(m.message));
      }
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Analysis worker failed"));
    };
  });
  worker.postMessage({ samples }, [samples.buffer]);
  return {
    result,
    cancel() {
      worker.terminate();
      settle?.reject(new Error("cancelled"));
    },
  };
}
