import * as Tone from 'tone';
import { renderOfflineAudio } from '../audio/offlineRender';

export async function runOfflineRenderChecks() {
  const originalContext = Tone.getContext();
  const duration = 60;
  const render = async (optimized: boolean) => {
    let synth: Tone.Synth | undefined;
    let offlineContext: Tone.OfflineContext | undefined;
    const started = performance.now();
    try {
      const buffer = await (optimized ? renderOfflineAudio : Tone.Offline)((context) => {
        offlineContext = context;
        synth = new Tone.Synth({ oscillator: { type: 'sine', phase: 0 } }).toDestination();
        for (let second = 0; second < duration; second += 2) {
          context.transport.schedule((time) => synth!.triggerAttackRelease(220, 0.5, time), second);
        }
        context.transport.start(0);
      }, duration, 2, 48000);
      return { samples: buffer.getChannelData(0), milliseconds: performance.now() - started };
    } finally {
      synth?.dispose();
      offlineContext?.dispose();
    }
  };
  const reference = await render(false);
  const optimized = await render(true);
  if (reference.samples.length !== optimized.samples.length) {
    throw new Error('Offline render length changed.');
  }
  let peakDifference = 0;
  let peakSignal = 0;
  for (let index = 0; index < reference.samples.length; index += 1) {
    peakDifference = Math.max(peakDifference, Math.abs(reference.samples[index] - optimized.samples[index]));
    peakSignal = Math.max(peakSignal, Math.abs(optimized.samples[index]));
  }
  if (peakDifference !== 0 || peakSignal === 0) {
    throw new Error(`Offline PCM mismatch: difference=${peakDifference}, signal=${peakSignal}`);
  }
  const expectedFailure = new Error('Scheduling failed');
  try {
    await renderOfflineAudio(() => { throw expectedFailure; }, 1, 2, 48000);
    throw new Error('Scheduling failure was swallowed.');
  } catch (error) {
    if (error !== expectedFailure) {
      throw error;
    }
  }
  if (Tone.getContext() !== originalContext) {
    throw new Error('Live audio context was not restored.');
  }
  return {
    referenceMilliseconds: reference.milliseconds,
    optimizedMilliseconds: optimized.milliseconds,
    peakDifference,
    peakSignal,
    contextRestored: true,
  };
}