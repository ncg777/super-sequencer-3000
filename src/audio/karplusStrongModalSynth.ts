import * as Tone from 'tone';
import {
  Monophonic,
  type MonophonicOptions,
} from 'tone/build/esm/instrument/Monophonic.js';
import type { Frequency, NormalRange, Seconds, Time } from 'tone/build/esm/core/type/Units.js';
import { FrequencyClass } from 'tone/build/esm/core/type/Frequency.js';
import {
  DEFAULT_GLIDE_SETTINGS,
  createMonoGlideState,
  getGlideFrequency,
  planMonoGlide,
  resetMonoGlideState,
  type GlidePlan,
  type GlideSettings,
} from './glide.js';

export type KarplusExciterType = 'white' | 'pink' | 'brown';

export interface KarplusStrongModalSettings {
  exciterType: KarplusExciterType;
  exciterDuration: number;
  exciterTone: number;
  pickPosition: number;
  decay: number;
  damping: number;
  dispersion: number;
  bodySize: number;
  bodyDecay: number;
  bodyMix: number;
  stringMix: number;
}

export const DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS: KarplusStrongModalSettings = {
  exciterType: 'pink',
  exciterDuration: 0.012,
  exciterTone: 0.72,
  pickPosition: 0.18,
  decay: 3.2,
  damping: 0.32,
  dispersion: 0.18,
  bodySize: 0.5,
  bodyDecay: 2.4,
  bodyMix: 0.62,
  stringMix: 0.72,
};

export const KARPLUS_MODAL_MODE_COUNT = 8;
const BODY_MODE_RATIOS = [1, 1.47, 2.09, 2.94, 4.12, 5.43, 6.82, 8.37] as const;
const BODY_MODE_GAINS = [1, 0.72, 0.56, 0.43, 0.33, 0.25, 0.19, 0.14] as const;
const MIN_FREQUENCY = 20;
const MAX_DELAY_SECONDS = 1 / MIN_FREQUENCY;

export interface KarplusWaveguidePlan {
  delaySeconds: number;
  feedback: number;
  dampingFrequency: number;
  dispersionFrequency: number;
  pickDelaySeconds: number;
}

export interface KarplusModalPlan {
  frequency: number;
  q: number;
  gain: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** Plans a stable, sample-rate-corrected waveguide for one fundamental. */
export function planKarplusWaveguide(
  frequency: number,
  sampleRate: number,
  settings: KarplusStrongModalSettings,
): KarplusWaveguidePlan {
  const safeFrequency = clamp(frequency, MIN_FREQUENCY, sampleRate * 0.45);
  const damping = clamp(settings.damping, 0, 1);
  const dispersion = clamp(settings.dispersion, 0, 1);
  const period = 1 / safeFrequency;
  const filterDelaySamples = 0.5 + damping * 1.5 + dispersion * 0.75;
  const delaySeconds = clamp(period - filterDelaySamples / sampleRate, 1 / sampleRate, MAX_DELAY_SECONDS);
  const decay = Math.max(0.08, settings.decay);
  const feedback = clamp(10 ** (-3 / (safeFrequency * decay)), 0, 0.9997);
  const dampingFrequency = clamp(
    safeFrequency * (3 + (1 - damping) * 48),
    safeFrequency * 1.5,
    sampleRate * 0.46,
  );
  const dispersionFrequency = clamp(
    safeFrequency * (1.5 + (1 - dispersion) * 18),
    safeFrequency,
    sampleRate * 0.46,
  );

  return {
    delaySeconds,
    feedback,
    dampingFrequency,
    dispersionFrequency,
    pickDelaySeconds: clamp(settings.pickPosition, 0.02, 0.5) * period,
  };
}

/** Inharmonic, frequency-tracked body modes with constant decay-time bandwidths. */
export function planKarplusModalBank(
  frequency: number,
  sampleRate: number,
  settings: KarplusStrongModalSettings,
): KarplusModalPlan[] {
  const safeFrequency = clamp(frequency, MIN_FREQUENCY, sampleRate * 0.45);
  const stiffness = clamp(settings.dispersion, 0, 1) * 0.00085;
  const sizeScale = 2 ** ((0.5 - clamp(settings.bodySize, 0, 1)) * 1.5);
  const bodyDecay = Math.max(0.08, settings.bodyDecay);

  return BODY_MODE_RATIOS.map((ratio, index) => {
    const modeNumber = index + 1;
    const stretchedRatio = ratio * Math.sqrt(1 + stiffness * modeNumber ** 2);
    const modalFrequency = Math.min(sampleRate * 0.46, safeFrequency * sizeScale * stretchedRatio);
    const bandwidth = 6.91 / (Math.PI * bodyDecay) * (1 + index * 0.18);
    return {
      frequency: modalFrequency,
      q: clamp(modalFrequency / bandwidth, 0.5, 180),
      gain: BODY_MODE_GAINS[index] / Math.sqrt(modeNumber),
    };
  }).filter((mode, index, modes) => index === 0 || mode.frequency > modes[index - 1].frequency + 1);
}

interface KarplusStrongModalSynthOptions extends MonophonicOptions, KarplusStrongModalSettings {
  envelope: {
    attack: Tone.Unit.Time;
    decay: Tone.Unit.Time;
    sustain: Tone.Unit.NormalRange;
    release: Tone.Unit.Time;
  };
}

interface ModalNodes {
  filter: Tone.Filter;
  gain: Tone.Gain;
}

export class KarplusStrongModalSynth extends Monophonic<KarplusStrongModalSynthOptions> {
  readonly name: string = 'KarplusStrongModalSynth';
  readonly frequency: Tone.Signal<'frequency'>;
  readonly detune: Tone.Signal<'cents'>;
  readonly envelope: Tone.AmplitudeEnvelope;

  private readonly exciter: Tone.Noise;
  private readonly exciterFilter: Tone.Filter;
  private readonly exciterEnvelope: Tone.AmplitudeEnvelope;
  private readonly pickDelay: Tone.Delay;
  private readonly pickPolarity: Tone.Gain;
  private readonly waveguideInput: Tone.Gain;
  private readonly waveguideDelay: Tone.Delay;
  private readonly dampingFilter: Tone.Filter;
  private readonly dispersionFilter: Tone.Filter;
  private readonly feedbackGain: Tone.Gain;
  private readonly stringGain: Tone.Gain;
  private readonly bodyInput: Tone.Gain;
  private readonly bodyGain: Tone.Gain;
  private readonly modalBank: ModalNodes[];
  protected settings: KarplusStrongModalSettings;
  protected currentFrequency = 440;
  private silenceTimeout: number | null = null;

  constructor(options?: Partial<KarplusStrongModalSynthOptions>) {
    const defaults = KarplusStrongModalSynth.getDefaults();
    const merged = {
      ...defaults,
      ...options,
      envelope: { ...defaults.envelope, ...(options?.envelope ?? {}) },
    };
    super(merged);

    this.settings = { ...DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS, ...merged };
    this.frequency = new Tone.Signal({ context: this.context, value: 440, units: 'frequency' });
    this.detune = new Tone.Signal({ context: this.context, value: merged.detune, units: 'cents' });
    this.envelope = new Tone.AmplitudeEnvelope({ context: this.context, ...merged.envelope });
    this.exciter = new Tone.Noise({ context: this.context, type: merged.exciterType });
    this.exciterFilter = new Tone.Filter({ context: this.context, type: 'lowpass', frequency: 9000, Q: 0.7 });
    this.exciterEnvelope = new Tone.AmplitudeEnvelope({
      context: this.context,
      attack: 0.0005,
      decay: merged.exciterDuration,
      sustain: 0,
      release: 0.002,
    });
    this.pickDelay = new Tone.Delay({ context: this.context, delayTime: 0.001, maxDelay: MAX_DELAY_SECONDS });
    this.pickPolarity = new Tone.Gain({ context: this.context, gain: -0.82 });
    this.waveguideInput = new Tone.Gain({ context: this.context, gain: 0.8 });
    this.waveguideDelay = new Tone.Delay({ context: this.context, delayTime: 1 / 440, maxDelay: MAX_DELAY_SECONDS });
    this.dampingFilter = new Tone.Filter({ context: this.context, type: 'lowpass', frequency: 8000, Q: 0.4 });
    this.dispersionFilter = new Tone.Filter({ context: this.context, type: 'allpass', frequency: 5000, Q: 0.35 });
    this.feedbackGain = new Tone.Gain({ context: this.context, gain: 0.98 });
    this.stringGain = new Tone.Gain({ context: this.context, gain: merged.stringMix });
    this.bodyInput = new Tone.Gain({ context: this.context, gain: 0.36 });
    this.bodyGain = new Tone.Gain({ context: this.context, gain: merged.bodyMix });

    this.exciter.chain(this.exciterFilter, this.exciterEnvelope);
    this.exciterEnvelope.connect(this.waveguideInput);
    this.exciterEnvelope.chain(this.pickDelay, this.pickPolarity, this.waveguideInput);
    this.waveguideInput.connect(this.waveguideDelay);
    this.waveguideDelay.chain(this.dampingFilter, this.dispersionFilter, this.feedbackGain, this.waveguideInput);
    this.waveguideDelay.connect(this.stringGain);
    this.waveguideDelay.connect(this.bodyInput);
    this.stringGain.connect(this.envelope);

    this.modalBank = Array.from({ length: KARPLUS_MODAL_MODE_COUNT }, () => {
      const filter = new Tone.Filter({ context: this.context, type: 'bandpass', frequency: 440, Q: 20 });
      const gain = new Tone.Gain({ context: this.context, gain: 0 });
      this.bodyInput.chain(filter, gain, this.bodyGain);
      return { filter, gain };
    });
    this.bodyGain.connect(this.envelope);
    this.envelope.connect(this.output);
    this.exciter.start();
    this.applySettings(this.settings);
    this.applyFrequency(440, this.now());
  }

  static getDefaults(): KarplusStrongModalSynthOptions {
    return {
      ...Monophonic.getDefaults(),
      envelope: { attack: 0.001, decay: 0.1, sustain: 1, release: 0.25 },
      ...DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS,
    };
  }

  private applySettings(settings: KarplusStrongModalSettings): void {
    this.exciter.type = settings.exciterType;
    this.exciterEnvelope.set({ decay: settings.exciterDuration });
    this.stringGain.gain.value = settings.stringMix;
    this.bodyGain.gain.value = settings.bodyMix;
    this.applyFrequency(this.currentFrequency, this.now());
  }

  protected applyFrequency(frequency: number, time: number): void {
    this.currentFrequency = Math.max(MIN_FREQUENCY, frequency);
    const waveguide = planKarplusWaveguide(this.currentFrequency, this.context.sampleRate, this.settings);
    const exciterCutoff = clamp(
      this.currentFrequency * (2 + this.settings.exciterTone * 48),
      this.currentFrequency * 1.5,
      this.context.sampleRate * 0.46,
    );
    this.waveguideDelay.delayTime.setValueAtTime(waveguide.delaySeconds, time);
    this.pickDelay.delayTime.setValueAtTime(waveguide.pickDelaySeconds, time);
    this.feedbackGain.gain.setValueAtTime(waveguide.feedback, time);
    this.dampingFilter.frequency.setValueAtTime(waveguide.dampingFrequency, time);
    this.dispersionFilter.frequency.setValueAtTime(waveguide.dispersionFrequency, time);
    this.exciterFilter.frequency.setValueAtTime(exciterCutoff, time);

    const modes = planKarplusModalBank(this.currentFrequency, this.context.sampleRate, this.settings);
    this.modalBank.forEach((nodes, index) => {
      const mode = modes[index];
      nodes.filter.frequency.setValueAtTime(mode?.frequency ?? this.context.sampleRate * 0.46, time);
      nodes.filter.Q.value = mode?.q ?? 0.5;
      nodes.gain.gain.value = mode?.gain ?? 0;
    });
  }

  set(props: Partial<KarplusStrongModalSynthOptions>): this {
    if (props.envelope) {
      this.envelope.set(props.envelope);
    }
    this.settings = { ...this.settings, ...props };
    this.applySettings(this.settings);
    return this;
  }

  setNote(note: Frequency | FrequencyClass, time?: Time): this {
    const seconds = this.toSeconds(time);
    const frequency = note instanceof FrequencyClass ? note.toFrequency() : Number(note);
    this.frequency.setValueAtTime(frequency, seconds);
    this.applyFrequency(frequency, seconds);
    return this;
  }

  triggerAttack(note: Frequency | FrequencyClass, time?: Time, velocity: NormalRange = 1): this {
    const seconds = this.toSeconds(time);
    this.setNote(note, seconds);
    this._triggerEnvelopeAttack(seconds, velocity);
    return this;
  }

  protected _triggerEnvelopeAttack(time: Seconds, velocity: NormalRange): void {
    if (this.silenceTimeout !== null) {
      this.context.clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
    this.exciterEnvelope.triggerAttack(time, velocity);
    this.envelope.triggerAttack(time, velocity);
  }

  protected _triggerEnvelopeRelease(time: Seconds): void {
    this.envelope.triggerRelease(time);
    const release = this.toSeconds(this.envelope.release);
    this.silenceTimeout = this.context.setTimeout(() => {
      this.silenceTimeout = null;
      this.onsilence(this);
    }, release + 0.05);
  }

  getLevelAtTime(time: Time): NormalRange {
    return this.envelope.getValueAtTime(this.toSeconds(time));
  }

  dispose(): this {
    if (this.silenceTimeout !== null) {
      this.context.clearTimeout(this.silenceTimeout);
    }
    this.exciter.dispose();
    this.exciterFilter.dispose();
    this.exciterEnvelope.dispose();
    this.pickDelay.dispose();
    this.pickPolarity.dispose();
    this.waveguideInput.dispose();
    this.waveguideDelay.dispose();
    this.dampingFilter.dispose();
    this.dispersionFilter.dispose();
    this.feedbackGain.dispose();
    this.stringGain.dispose();
    this.bodyInput.dispose();
    this.bodyGain.dispose();
    this.modalBank.forEach(({ filter, gain }) => {
      filter.dispose();
      gain.dispose();
    });
    this.frequency.dispose();
    this.detune.dispose();
    this.envelope.dispose();
    return super.dispose();
  }
}

export class MonoKarplusStrongModalSynth extends KarplusStrongModalSynth {
  readonly name: string = 'MonoKarplusStrongModalSynth';

  private glideSettings: GlideSettings = { ...DEFAULT_GLIDE_SETTINGS };
  private readonly glideState = createMonoGlideState();

  setGlide(settings: GlideSettings): void {
    this.glideSettings = { ...settings };
  }

  resetGlide(): void {
    resetMonoGlideState(this.glideState);
  }

  triggerNotes(frequencies: readonly number[], duration: Tone.Unit.Time, time: Tone.Unit.Time, velocity: number): void {
    if (frequencies.length === 0) {
      return;
    }
    const targetFrequency = Math.max(...frequencies);
    const startTime = this.toSeconds(time);
    const endTime = startTime + Math.max(this.sampleTime, this.toSeconds(duration));
    const plan = planMonoGlide(this.glideState, targetFrequency, startTime, endTime, this.glideSettings);

    if (plan.legato && this.glideSettings.legato) {
      this.envelope.cancel(startTime);
      this.scheduleGlide(plan, startTime);
    } else {
      this.triggerAttack(plan.fromFrequency, startTime, velocity);
      this.scheduleGlide(plan, startTime);
    }
    this.triggerRelease(endTime);
  }

  private scheduleGlide(plan: GlidePlan, startTime: number): void {
    if (plan.seconds <= 0) {
      this.setNote(plan.toFrequency, startTime);
      return;
    }

    const steps = Math.max(8, Math.min(64, Math.ceil(plan.seconds * 120)));
    for (let step = 0; step <= steps; step += 1) {
      const elapsed = plan.seconds * step / steps;
      const frequency = getGlideFrequency(plan, elapsed);
      this.frequency.setValueAtTime(frequency, startTime + elapsed);
      this.applyFrequency(frequency, startTime + elapsed);
    }
  }
}