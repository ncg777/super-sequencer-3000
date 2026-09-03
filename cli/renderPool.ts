import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import {
  renderWavChannels,
  type GenerateOptions,
  type WavChannelRenderResult,
} from './generate.js';

interface WorkerResultMessage {
  result?: WavChannelRenderResult;
  error?: string;
}

function resolvedThreadCount(requestedThreads: number | undefined, trackCount: number): number {
  const automatic = Math.max(1, availableParallelism() - 1);
  const requested = Number.isFinite(requestedThreads)
    ? Math.max(1, Math.floor(requestedThreads as number))
    : automatic;
  return Math.min(trackCount, requested);
}

function renderTrackInWorker(options: GenerateOptions, trackIndex: number): Promise<WavChannelRenderResult> {
  const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
  const workerUrl = new URL(`./renderTrackWorker.${extension}`, import.meta.url);
  return new Promise<WavChannelRenderResult>((resolve, reject) => {
    const worker = new Worker(workerUrl, { workerData: { options, trackIndex } });
    const terminate = () => {
      void worker.terminate();
    };
    worker.once('message', (message: WorkerResultMessage) => {
      terminate();
      if (message.error || !message.result) {
        reject(new Error(message.error ?? 'WAV render worker returned no result.'));
        return;
      }
      resolve(message.result);
    });
    worker.once('error', (error) => {
      terminate();
      reject(error);
    });
    worker.once('exit', (code) => {
      if (code !== 0) {
        terminate();
        reject(new Error(`WAV render worker exited with code ${code}.`));
      }
    });
  });
}

export async function renderWavChannelsInPool(
  options: GenerateOptions,
  trackCount: number,
  requestedThreads?: number,
): Promise<WavChannelRenderResult[]> {
  const threadCount = resolvedThreadCount(requestedThreads, trackCount);
  const results = new Array<WavChannelRenderResult>(trackCount);
  let nextTrackIndex = 0;

  const renderNext = async (): Promise<void> => {
    while (nextTrackIndex < trackCount) {
      const trackIndex = nextTrackIndex;
      nextTrackIndex += 1;
      results[trackIndex] = threadCount === 1
        ? await renderWavChannels(options, trackIndex)
        : await renderTrackInWorker(options, trackIndex);
    }
  };

  await Promise.all(Array.from({ length: threadCount }, () => renderNext()));
  return results;
}