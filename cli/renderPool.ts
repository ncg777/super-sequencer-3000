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

function createRenderWorker(options: GenerateOptions): Worker {
  const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js';
  const workerUrl = new URL(`./renderTrackWorker.${extension}`, import.meta.url);
  return extension === 'ts'
    ? new Worker(`
        const { workerData } = require('node:worker_threads');
        import('tsx/esm/api').then(({ tsImport }) => tsImport(workerData.moduleUrl, workerData.moduleUrl));
      `, { eval: true, workerData: { options, moduleUrl: workerUrl.href } })
    : new Worker(workerUrl, { workerData: { options } });
}

function renderTrackInWorker(worker: Worker, trackIndex: number): Promise<WavChannelRenderResult> {
  return new Promise<WavChannelRenderResult>((resolve, reject) => {
    const cleanup = () => {
      worker.off('message', onMessage);
      worker.off('error', onError);
      worker.off('exit', onExit);
    };
    const onMessage = (message: WorkerResultMessage) => {
      cleanup();
      if (message.error || !message.result) {
        reject(new Error(message.error ?? 'WAV render worker returned no result.'));
        return;
      }
      resolve(message.result);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };
    const onExit = (code: number) => {
      cleanup();
      reject(new Error(`WAV render worker exited before returning a result (code ${code}).`));
    };
    worker.once('message', onMessage);
    worker.once('error', onError);
    worker.once('exit', onExit);
    worker.postMessage(trackIndex);
  });
}

export async function* iterateWavChannelRenders(
  options: GenerateOptions,
  trackCount: number,
  requestedThreads?: number,
): AsyncGenerator<WavChannelRenderResult> {
  const threadCount = resolvedThreadCount(requestedThreads, trackCount);
  if (threadCount <= 1) {
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
      yield await renderWavChannels(options, trackIndex);
    }
    return;
  }

  const workers: Worker[] = [];
  const pending: Array<Promise<WorkerResultMessage> | undefined> = [];
  const dispatch = (worker: Worker, trackIndex: number): Promise<WorkerResultMessage> => (
    renderTrackInWorker(worker, trackIndex).then(
      (result) => ({ result }),
      (error: unknown) => ({ error: error instanceof Error ? error.message : String(error) }),
    )
  );
  try {
    for (let trackIndex = 0; trackIndex < threadCount; trackIndex += 1) {
      const worker = createRenderWorker(options);
      workers.push(worker);
      pending.push(dispatch(worker, trackIndex));
    }
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
      const slot = trackIndex % threadCount;
      const message = await pending[slot];
      pending[slot] = undefined;
      if (!message?.result) {
        throw new Error(message?.error ?? 'WAV render worker returned no result.');
      }
      yield message.result;
      const nextTrackIndex = trackIndex + threadCount;
      if (nextTrackIndex < trackCount) {
        pending[slot] = dispatch(workers[slot], nextTrackIndex);
      }
    }
  } finally {
    await Promise.all(workers.map((worker) => worker.terminate()));
  }
}

export async function renderWavChannelsInPool(
  options: GenerateOptions,
  trackCount: number,
  requestedThreads?: number,
): Promise<WavChannelRenderResult[]> {
  const results: WavChannelRenderResult[] = [];
  for await (const result of iterateWavChannelRenders(options, trackCount, requestedThreads)) {
    results.push(result);
  }
  return results;
}