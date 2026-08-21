import { markRaw } from 'vue';
import * as Tone from 'tone';

export interface ReverbAudioChain {
  lowCut: Tone.Filter;
  highCut: Tone.Filter;
  convolver: Tone.Convolver;
  impulseKey: string;
  /** Whether the convolver tail is currently plugged into the destination. */
  outputConnected: boolean;
}

export interface ReverbSettings {
  decay: number;
  preDelay: number;
  lowCutFrequency: number;
  highCutFrequency: number;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function fillPinkNoise(channel: Float32Array, startFrame: number, decayFrames: number, seed: number) {
  const random = createSeededRandom(seed);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;

  for (let frame = 0; frame < decayFrames; frame += 1) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    b6 = white * 0.115926;

    const progress = frame / Math.max(1, decayFrames - 1);
    const envelope = Math.exp(-6 * progress);
    channel[startFrame + frame] = pink * 0.11 * envelope;
  }
}

export function createPinkNoiseImpulse(decay: number, preDelay: number): AudioBuffer {
  const context = Tone.getContext();
  const sampleRate = context.sampleRate;
  const safeDecay = Math.max(0.1, decay);
  const safePreDelay = Math.max(0, preDelay);
  const preDelayFrames = Math.round(safePreDelay * sampleRate);
  const decayFrames = Math.max(1, Math.round(safeDecay * sampleRate));
  const impulse = context.createBuffer(2, preDelayFrames + decayFrames, sampleRate);

  fillPinkNoise(impulse.getChannelData(0), preDelayFrames, decayFrames, 0x7f4a7c15);
  fillPinkNoise(impulse.getChannelData(1), preDelayFrames, decayFrames, 0x3c6ef372);
  return impulse;
}

function getImpulseKey(settings: ReverbSettings): string {
  return `${settings.decay}:${settings.preDelay}:${Tone.getContext().sampleRate}`;
}

export function createReverbAudioChain(settings: ReverbSettings): ReverbAudioChain {
  const lowCut = markRaw(new Tone.Filter({ type: 'highpass', frequency: settings.lowCutFrequency, rolloff: -12 })) as Tone.Filter;
  const highCut = markRaw(new Tone.Filter({ type: 'lowpass', frequency: settings.highCutFrequency, rolloff: -12 })) as Tone.Filter;
  const convolver = markRaw(new Tone.Convolver({
    normalize: true,
    url: createPinkNoiseImpulse(settings.decay, settings.preDelay),
  }).toDestination()) as Tone.Convolver;

  lowCut.chain(highCut, convolver);
  return {
    lowCut,
    highCut,
    convolver,
    impulseKey: getImpulseKey(settings),
    outputConnected: true,
  };
}

/**
 * Convolution reverb costs the same CPU whether or not anything is being sent into it,
 * so the tail is unplugged from the destination while the reverb bus is switched off.
 */
export function setReverbOutputEnabled(chain: ReverbAudioChain, enabled: boolean) {
  if (chain.outputConnected === enabled) {
    return;
  }

  if (enabled) {
    chain.convolver.toDestination();
  } else {
    chain.convolver.disconnect();
  }
  chain.outputConnected = enabled;
}

export function updateReverbAudioChain(chain: ReverbAudioChain, settings: ReverbSettings) {
  chain.lowCut.set({ frequency: settings.lowCutFrequency });
  chain.highCut.set({ frequency: settings.highCutFrequency });

  const impulseKey = getImpulseKey(settings);
  if (chain.impulseKey !== impulseKey) {
    const buffer = chain.convolver.buffer;
    if (buffer) {
      buffer.set(createPinkNoiseImpulse(settings.decay, settings.preDelay));
      chain.convolver.buffer = buffer;
    }
    chain.impulseKey = impulseKey;
  }
}

export function disposeReverbAudioChain(chain: ReverbAudioChain) {
  chain.lowCut.dispose();
  chain.highCut.dispose();
  chain.convolver.dispose();
}