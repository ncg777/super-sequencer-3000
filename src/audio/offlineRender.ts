import * as Tone from 'tone';

export interface OfflineWindowScheduler {
  scheduleWindow: (startSeconds: number, endSeconds: number) => void | Promise<void>;
}

export interface WindowedOfflineRenderOptions {
  duration: number;
  channels: number;
  sampleRate: number;
  windowSeconds: number;
  setup: (context: Tone.OfflineContext) => OfflineWindowScheduler | Promise<OfflineWindowScheduler>;
  onProgress?: (ratio: number) => void | Promise<void>;
}

interface PrivateOfflineClock {
  _currentTime: number;
  emit: (event: 'tick') => void;
  workletsAreReady: () => Promise<void>;
}

interface SuspendableOfflineContext {
  _nativeOfflineAudioContext?: OfflineAudioContext;
  startRendering?: () => Promise<AudioBuffer>;
  suspend?: (when: number) => Promise<void>;
  resume?: () => Promise<void>;
}

function getSuspendableContext(context: Tone.OfflineContext): {
  renderContext: SuspendableOfflineContext;
  suspendContext: SuspendableOfflineContext;
} | null {
  const renderContext = context.rawContext as unknown as SuspendableOfflineContext;
  const suspendContext = renderContext._nativeOfflineAudioContext ?? renderContext;
  if (typeof renderContext.startRendering !== 'function'
    || typeof suspendContext.suspend !== 'function'
    || typeof suspendContext.resume !== 'function') {
    return null;
  }
  return { renderContext, suspendContext };
}

export async function renderOfflineInWindows(
  options: WindowedOfflineRenderOptions,
): Promise<Tone.ToneAudioBuffer | null> {
  const originalContext = Tone.getContext();
  const context = new Tone.OfflineContext(options.channels, options.duration, options.sampleRate);
  const privateContext = context as unknown as PrivateOfflineClock;
  const contexts = getSuspendableContext(context);
  if (!contexts
    || typeof privateContext.emit !== 'function'
    || typeof privateContext._currentTime !== 'number'
    || typeof privateContext.workletsAreReady !== 'function') {
    await context.close();
    return null;
  }

  const quantumSeconds = 128 / options.sampleRate;
  const windowQuanta = Math.max(1, Math.round(options.windowSeconds / quantumSeconds));
  const totalQuanta = Math.ceil(options.duration / quantumSeconds);
  const boundaries: number[] = [];
  for (let quantum = windowQuanta; quantum < totalQuanta; quantum += windowQuanta) {
    boundaries.push(quantum * quantumSeconds);
  }

  const pumpClock = (endSeconds: number) => {
    while (privateContext._currentTime < endSeconds) {
      privateContext.emit('tick');
      privateContext._currentTime += quantumSeconds;
    }
  };

  Tone.setContext(context);
  try {
    const scheduler = await options.setup(context);
    const firstBoundary = boundaries[0] ?? options.duration + quantumSeconds;
    await scheduler.scheduleWindow(0, Math.min(options.duration, firstBoundary));
    pumpClock(firstBoundary);

    const suspensionTasks: Promise<void>[] = [];
    for (let index = 0; index < boundaries.length; index += 1) {
      const boundary = boundaries[index];
      const nextBoundary = boundaries[index + 1] ?? options.duration + quantumSeconds;
      const suspension = contexts.suspendContext.suspend?.(boundary);
      if (suspension) {
        suspensionTasks.push(suspension.then(async () => {
          try {
            await scheduler.scheduleWindow(boundary, Math.min(options.duration, nextBoundary));
            pumpClock(nextBoundary);
            await options.onProgress?.(Math.min(1, boundary / options.duration));
          } finally {
            await contexts.suspendContext.resume?.();
          }
        }));
      }
    }

    await privateContext.workletsAreReady();
    const rendering = contexts.renderContext.startRendering?.();
    Tone.setContext(originalContext);
    if (!rendering) {
      throw new Error('Offline rendering did not start.');
    }
    const [buffer] = await Promise.all([rendering, Promise.all(suspensionTasks)]);
    await options.onProgress?.(1);
    return new Tone.ToneAudioBuffer(buffer);
  } finally {
    Tone.setContext(originalContext);
    await context.close();
  }
}