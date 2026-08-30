import * as Tone from 'tone';
import {
  Monophonic,
  type MonophonicOptions,
} from 'tone/build/esm/instrument/Monophonic.js';
import { buildPitchEnvelopeCurve } from './pitchEnvelope.js';
import {
  DEFAULT_GLIDE_SETTINGS,
  createMonoGlideState,
  planMonoGlide,
  resetMonoGlideState,
  type GlidePlan,
  type GlideSettings,
} from './glide.js';

export type FmAlgorithm = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type FmOperatorWaveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

export interface FmOperatorSettings {
  ratio: number;
  detune: number;
  level: number;
  waveform: FmOperatorWaveform;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface FourOperatorFmSettings {
  algorithm: FmAlgorithm;
  modulationIndex: number;
  feedback: number;
  operators: FmOperatorSettings[];
}

export interface FmAlgorithmDefinition {
  value: FmAlgorithm;
  name: string;
  carriers: number[];
  routes: Array<{ from: number; to: number }>;
  diagram: string;
}

export const FM_ALGORITHMS: readonly FmAlgorithmDefinition[] = [
  { value: 1, name: 'Deep cascade', carriers: [0], routes: [{ from: 3, to: 2 }, { from: 2, to: 1 }, { from: 1, to: 0 }], diagram: '4 > 3 > 2 > 1' },
  { value: 2, name: 'Twin into cascade', carriers: [0], routes: [{ from: 3, to: 1 }, { from: 2, to: 1 }, { from: 1, to: 0 }], diagram: '(4 + 3) > 2 > 1' },
  { value: 3, name: 'Split stack', carriers: [0], routes: [{ from: 3, to: 2 }, { from: 2, to: 0 }, { from: 1, to: 0 }], diagram: '(4 > 3 + 2) > 1' },
  { value: 4, name: 'Dual stacks', carriers: [0, 2], routes: [{ from: 1, to: 0 }, { from: 3, to: 2 }], diagram: '(2 > 1) + (4 > 3)' },
  { value: 5, name: 'Fork', carriers: [0, 1, 2], routes: [{ from: 3, to: 0 }, { from: 3, to: 1 }, { from: 3, to: 2 }], diagram: '4 > (1 + 2 + 3)' },
  { value: 6, name: 'Stack plus two', carriers: [0, 1, 2], routes: [{ from: 3, to: 2 }], diagram: '1 + 2 + (4 > 3)' },
  { value: 7, name: 'One stack plus two', carriers: [0, 1, 3], routes: [{ from: 2, to: 1 }], diagram: '1 + (3 > 2) + 4' },
  { value: 8, name: 'Additive', carriers: [0, 1, 2, 3], routes: [], diagram: '1 + 2 + 3 + 4' },
] as const;

export const DEFAULT_FM_OPERATORS: readonly FmOperatorSettings[] = [
  { ratio: 1, detune: 0, level: 1, waveform: 'sine', attack: 0.005, decay: 0.2, sustain: 0.8, release: 0.3 },
  { ratio: 2, detune: 0, level: 0.75, waveform: 'sine', attack: 0.005, decay: 0.35, sustain: 0.5, release: 0.25 },
  { ratio: 3, detune: 0, level: 0.6, waveform: 'sine', attack: 0.005, decay: 0.25, sustain: 0.35, release: 0.2 },
  { ratio: 4, detune: 0, level: 0.5, waveform: 'sine', attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.15 },
] as const;

export const DEFAULT_FM_SETTINGS: FourOperatorFmSettings = {
  algorithm: 1,
  modulationIndex: 4,
  feedback: 0,
  operators: DEFAULT_FM_OPERATORS.map((operator) => ({ ...operator })),
};

interface FourOperatorFmSynthOptions extends MonophonicOptions, FourOperatorFmSettings {
  envelope: {
    attack: Tone.Unit.Time;
    decay: Tone.Unit.Time;
    sustain: Tone.Unit.NormalRange;
    release: Tone.Unit.Time;
  };
  pitchEnvelope: {
    attack: Tone.Unit.Time;
    decay: Tone.Unit.Time;
    sustain: Tone.Unit.NormalRange;
    release: Tone.Unit.Time;
  };
  pitchEnvelopeAmount: number;
  pitchEnvelopeShape: number;
}

interface OperatorNodes {
  oscillator: Tone.Oscillator;
  ratio: Tone.Multiply;
  envelope: Tone.AmplitudeEnvelope;
  level: Tone.Gain;
}

interface ModulationRoute {
  gain: Tone.Gain;
  scale: Tone.Multiply;
}

export class FourOperatorFmSynth extends Monophonic<FourOperatorFmSynthOptions> {
  readonly name: string = 'FourOperatorFmSynth';
  readonly frequency: Tone.Signal<'frequency'>;
  readonly detune: Tone.Signal<'cents'>;
  readonly envelope: Tone.AmplitudeEnvelope;
  readonly pitchEnvelope: Tone.Envelope;

  protected readonly operators: OperatorNodes[];
  private readonly carrierMix: Tone.Gain;
  private readonly pitchCents: Tone.Multiply;
  private readonly feedbackDelay: Tone.Delay;
  private readonly feedbackGain: Tone.Gain;
  private readonly feedbackScale: Tone.Multiply;
  private modulationRoutes: ModulationRoute[] = [];
  private operatorSettings: FmOperatorSettings[];
  private algorithm: FmAlgorithm;
  private modulationIndex: number;
  private feedback: number;
  private pitchEnvelopeShape = 0;

  constructor(options?: Partial<FourOperatorFmSynthOptions>) {
    const defaults = FourOperatorFmSynth.getDefaults();
    const merged = {
      ...defaults,
      ...options,
      envelope: { ...defaults.envelope, ...(options?.envelope ?? {}) },
      pitchEnvelope: { ...defaults.pitchEnvelope, ...(options?.pitchEnvelope ?? {}) },
      operators: defaults.operators.map((operator, index) => ({
        ...operator,
        ...(options?.operators?.[index] ?? {}),
      })),
    };
    super(merged);

    this.frequency = new Tone.Signal({ context: this.context, value: 440, units: 'frequency' });
    this.detune = new Tone.Signal({ context: this.context, value: merged.detune, units: 'cents' });
    this.envelope = new Tone.AmplitudeEnvelope({ context: this.context, ...merged.envelope });
    this.pitchEnvelope = new Tone.Envelope({ context: this.context, ...merged.pitchEnvelope });
    this.pitchCents = new Tone.Multiply({ context: this.context, value: merged.pitchEnvelopeAmount * 100 });
    this.carrierMix = new Tone.Gain({ context: this.context, gain: 1 });
    this.feedbackDelay = new Tone.Delay({ context: this.context, delayTime: 1 / this.context.sampleRate, maxDelay: 0.01 });
    this.feedbackGain = new Tone.Gain({ context: this.context, gain: 0 });
    this.feedbackScale = new Tone.Multiply({ context: this.context, value: merged.feedback });

    this.operatorSettings = merged.operators;
    this.algorithm = merged.algorithm;
    this.modulationIndex = merged.modulationIndex;
    this.feedback = merged.feedback;
    this.operators = this.operatorSettings.map((operator, index) => {
      const ratio = new Tone.Multiply({ context: this.context, value: operator.ratio });
      const oscillator = new Tone.Oscillator({
        context: this.context,
        type: operator.waveform,
        frequency: 0,
        detune: operator.detune,
        phase: index % 2 === 0 ? 0 : 90,
        ...(index === 0 ? { onstop: () => this.onsilence(this) } : {}),
      });
      const operatorEnvelope = new Tone.AmplitudeEnvelope({
        context: this.context,
        attack: operator.attack,
        decay: operator.decay,
        sustain: operator.sustain,
        release: operator.release,
      });
      const level = new Tone.Gain({ context: this.context, gain: operator.level });
      this.frequency.chain(ratio, oscillator.frequency);
      this.detune.connect(oscillator.detune);
      oscillator.chain(operatorEnvelope, level);
      return { oscillator, ratio, envelope: operatorEnvelope, level };
    });

    this.pitchEnvelope.chain(this.pitchCents, this.detune);
    this.carrierMix.chain(this.envelope, this.output);
    this.feedbackDelay.chain(this.feedbackGain, this.operators[3].oscillator.frequency);
    this.frequency.chain(this.feedbackScale, this.feedbackGain.gain);
    this.applyAlgorithm();
    this.pitchEnvelopeShape = merged.pitchEnvelopeShape;
    this.applyPitchEnvelopeShape();
  }

  static getDefaults(): FourOperatorFmSynthOptions {
    return {
      ...Monophonic.getDefaults(),
      envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.2 },
      pitchEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.2 },
      pitchEnvelopeAmount: 0,
      pitchEnvelopeShape: 0,
      ...DEFAULT_FM_SETTINGS,
      operators: DEFAULT_FM_SETTINGS.operators.map((operator) => ({ ...operator })),
    };
  }

  private applyAlgorithm(): void {
    this.operators.forEach((operator) => operator.level.disconnect());
    this.modulationRoutes.forEach(({ gain, scale }) => {
      gain.dispose();
      scale.dispose();
    });
    this.modulationRoutes = [];

    const definition = FM_ALGORITHMS.find((algorithm) => algorithm.value === this.algorithm) ?? FM_ALGORITHMS[0];
    const carrierGain = 1 / Math.sqrt(definition.carriers.length);
    definition.carriers.forEach((operatorIndex) => {
      this.operators[operatorIndex].level.connect(this.carrierMix, 0, 0);
    });
    this.carrierMix.gain.value = carrierGain;

    definition.routes.forEach(({ from, to }) => {
      const gain = new Tone.Gain({ context: this.context, gain: 0 });
      const scale = new Tone.Multiply({ context: this.context, value: this.modulationIndex });
      this.frequency.chain(scale, gain.gain);
      this.operators[from].level.chain(gain, this.operators[to].oscillator.frequency);
      this.modulationRoutes.push({ gain, scale });
    });
    this.operators[3].level.connect(this.feedbackDelay);
  }

  private applyPitchEnvelopeShape(): void {
    if (this.pitchEnvelopeShape < 1e-6) {
      this.pitchEnvelope.attackCurve = 'linear';
      this.pitchEnvelope.decayCurve = 'linear';
      this.pitchEnvelope.releaseCurve = 'linear';
      return;
    }
    const curve = buildPitchEnvelopeCurve(this.pitchEnvelopeShape);
    this.pitchEnvelope.attackCurve = curve;
    this.pitchEnvelope.decayCurve = 'exponential';
    this.pitchEnvelope.releaseCurve = curve.slice().reverse();
  }

  set(props: Partial<FourOperatorFmSynthOptions>): this {
    if (props.envelope) {
      this.envelope.set(props.envelope);
    }
    if (props.pitchEnvelope) {
      this.pitchEnvelope.set(props.pitchEnvelope);
    }
    if (typeof props.pitchEnvelopeAmount === 'number') {
      this.pitchCents.value = props.pitchEnvelopeAmount * 100;
    }
    if (typeof props.pitchEnvelopeShape === 'number') {
      this.pitchEnvelopeShape = props.pitchEnvelopeShape;
      this.applyPitchEnvelopeShape();
    }
    if (props.operators) {
      this.operatorSettings = this.operatorSettings.map((operator, index) => ({
        ...operator,
        ...(props.operators?.[index] ?? {}),
      }));
      this.operatorSettings.forEach((operator, index) => {
        const nodes = this.operators[index];
        nodes.ratio.value = operator.ratio;
        nodes.oscillator.set({ type: operator.waveform, detune: operator.detune });
        nodes.envelope.set({
          attack: operator.attack,
          decay: operator.decay,
          sustain: operator.sustain,
          release: operator.release,
        });
        nodes.level.gain.value = operator.level;
      });
    }
    let reroute = false;
    if (props.algorithm && props.algorithm !== this.algorithm) {
      this.algorithm = props.algorithm;
      reroute = true;
    }
    if (typeof props.modulationIndex === 'number' && props.modulationIndex !== this.modulationIndex) {
      this.modulationIndex = props.modulationIndex;
      reroute = true;
    }
    if (typeof props.feedback === 'number') {
      this.feedback = props.feedback;
      this.feedbackScale.value = props.feedback;
    }
    if (reroute) {
      this.applyAlgorithm();
    }
    return this;
  }

  protected startOperators(time: number): void {
    this.operators.forEach((operator) => operator.oscillator.start(time));
  }

  protected stopOperators(time: number): void {
    this.operators.forEach((operator) => operator.oscillator.stop(time));
  }

  protected _triggerEnvelopeAttack(time: number, velocity: number): void {
    this.startOperators(time);
    this.operators.forEach((operator) => operator.envelope.triggerAttack(time));
    this.envelope.triggerAttack(time, velocity);
    this.pitchEnvelope.triggerAttack(time);
  }

  protected _triggerEnvelopeRelease(time: number): void {
    this.operators.forEach((operator) => operator.envelope.triggerRelease(time));
    this.envelope.triggerRelease(time);
    this.pitchEnvelope.triggerRelease(time);
    const release = Math.max(
      this.toSeconds(this.envelope.release),
      this.toSeconds(this.pitchEnvelope.release),
      ...this.operators.map((operator) => this.toSeconds(operator.envelope.release)),
    );
    this.stopOperators(time + release);
  }

  getLevelAtTime(time: Tone.Unit.Time): Tone.Unit.NormalRange {
    return this.envelope.getValueAtTime(this.toSeconds(time));
  }

  dispose(): this {
    this.modulationRoutes.forEach(({ gain, scale }) => {
      gain.dispose();
      scale.dispose();
    });
    this.operators.forEach((operator) => {
      operator.oscillator.dispose();
      operator.ratio.dispose();
      operator.envelope.dispose();
      operator.level.dispose();
    });
    this.frequency.dispose();
    this.detune.dispose();
    this.envelope.dispose();
    this.pitchEnvelope.dispose();
    this.pitchCents.dispose();
    this.carrierMix.dispose();
    this.feedbackDelay.dispose();
    this.feedbackGain.dispose();
    this.feedbackScale.dispose();
    return super.dispose();
  }
}

export class MonoFourOperatorFmSynth extends FourOperatorFmSynth {
  readonly name: string = 'MonoFourOperatorFmSynth';

  private glideSettings: GlideSettings = { ...DEFAULT_GLIDE_SETTINGS };
  private readonly glideState = createMonoGlideState();
  private pendingGlide: GlidePlan | null = null;
  private oscillatorsRunning = false;

  setGlide(settings: GlideSettings): void {
    this.glideSettings = { ...settings };
  }

  resetGlide(): void {
    resetMonoGlideState(this.glideState);
    this.pendingGlide = null;
    if (this.oscillatorsRunning) {
      this.oscillatorsRunning = false;
      super.stopOperators(this.now());
    }
  }

  triggerNotes(frequencies: readonly number[], duration: Tone.Unit.Time, time: Tone.Unit.Time, velocity: number): void {
    if (frequencies.length === 0) {
      return;
    }
    const targetFrequency = Math.max(...frequencies);
    const startTime = this.toSeconds(time);
    const endTime = startTime + Math.max(this.sampleTime, this.toSeconds(duration));
    const plan = planMonoGlide(this.glideState, targetFrequency, startTime, endTime, this.glideSettings);
    this.pendingGlide = plan;
    if (plan.legato && this.glideSettings.legato) {
      this.envelope.cancel(startTime);
      this.pitchEnvelope.cancel(startTime);
      this.operators.forEach((operator) => operator.envelope.cancel(startTime));
      this.setNote(targetFrequency, startTime);
    } else {
      this.triggerAttack(targetFrequency, startTime, velocity);
    }
    this.triggerRelease(endTime);
  }

  setNote(note: Tone.Unit.Frequency | Tone.FrequencyClass, time?: Tone.Unit.Time): this {
    const plan = this.pendingGlide;
    this.pendingGlide = null;
    if (!plan || plan.seconds <= 0) {
      return super.setNote(note, time);
    }
    const startTime = this.toSeconds(time);
    this.frequency.cancelScheduledValues(startTime);
    this.frequency.setValueAtTime(plan.fromFrequency, startTime);
    if (plan.curve === 'linear') {
      this.frequency.linearRampToValueAtTime(plan.toFrequency, startTime + plan.seconds);
    } else {
      this.frequency.exponentialRampToValueAtTime(plan.toFrequency, startTime + plan.seconds);
    }
    return this;
  }

  protected startOperators(time: number): void {
    if (!this.oscillatorsRunning) {
      this.oscillatorsRunning = true;
      super.startOperators(time);
    }
  }

  protected stopOperators(_time: number): void {
    // The oscillators free-run so a legato pitch change does not restart their phases.
  }

  dispose(): this {
    if (this.oscillatorsRunning) {
      this.oscillatorsRunning = false;
      super.stopOperators(this.now());
    }
    return super.dispose();
  }
}