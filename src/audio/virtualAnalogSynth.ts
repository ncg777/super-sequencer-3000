import * as Tone from 'tone';
import {
  Monophonic,
  type MonophonicOptions,
} from 'tone/build/esm/instrument/Monophonic.js';
import type { OmniOscillatorType } from 'tone/build/esm/source/oscillator/OscillatorInterface.js';
import { buildPitchEnvelopeCurve } from './pitchEnvelope.js';
import {
  DEFAULT_GLIDE_SETTINGS,
  createMonoGlideState,
  planMonoGlide,
  resetMonoGlideState,
  type GlidePlan,
  type GlideSettings,
} from './glide.js';

export const VIRTUAL_ANALOG_OSCILLATOR_COUNT = 3;
export const MAX_VIRTUAL_ANALOG_UNISON = 4;

export type VirtualAnalogWaveform = 'sine' | 'triangle' | 'sawtooth' | 'square' | 'pulse';
export type VirtualAnalogSubWaveform = Exclude<VirtualAnalogWaveform, 'pulse'>;
export type VirtualAnalogNoiseType = 'white' | 'pink' | 'brown';

export interface VirtualAnalogOscillatorSettings {
  enabled: boolean;
  waveform: VirtualAnalogWaveform;
  octave: number;
  semitone: number;
  detune: number;
  level: number;
  pan: number;
  phase: number;
  unisonVoices: number;
  unisonDetune: number;
  stereoSpread: number;
  pulseWidth: number;
  pwmRate: number;
  pwmDepth: number;
}

export interface VirtualAnalogSubSettings {
  enabled: boolean;
  waveform: VirtualAnalogSubWaveform;
  octave: number;
  detune: number;
  level: number;
  pan: number;
}

export interface VirtualAnalogNoiseSettings {
  enabled: boolean;
  type: VirtualAnalogNoiseType;
  level: number;
  pan: number;
}

export interface VirtualAnalogSettings {
  oscillators: VirtualAnalogOscillatorSettings[];
  drift: number;
  driftRate: number;
  ringMod: number;
  ringModPan: number;
  sub: VirtualAnalogSubSettings;
  noise: VirtualAnalogNoiseSettings;
}

export const DEFAULT_VIRTUAL_ANALOG_OSCILLATORS: readonly VirtualAnalogOscillatorSettings[] = [
  {
    enabled: true,
    waveform: 'sawtooth',
    octave: 0,
    semitone: 0,
    detune: -4,
    level: 0.65,
    pan: -0.12,
    phase: 0,
    unisonVoices: 2,
    unisonDetune: 10,
    stereoSpread: 0.7,
    pulseWidth: 0.5,
    pwmRate: 0.18,
    pwmDepth: 0,
  },
  {
    enabled: true,
    waveform: 'sawtooth',
    octave: 0,
    semitone: 0,
    detune: 4,
    level: 0.55,
    pan: 0.12,
    phase: 180,
    unisonVoices: 2,
    unisonDetune: 10,
    stereoSpread: 0.7,
    pulseWidth: 0.5,
    pwmRate: 0.23,
    pwmDepth: 0,
  },
  {
    enabled: true,
    waveform: 'pulse',
    octave: -1,
    semitone: 0,
    detune: 0,
    level: 0.35,
    pan: 0,
    phase: 90,
    unisonVoices: 1,
    unisonDetune: 0,
    stereoSpread: 0,
    pulseWidth: 0.42,
    pwmRate: 0.13,
    pwmDepth: 0.08,
  },
] as const;

export const DEFAULT_VIRTUAL_ANALOG_SETTINGS: VirtualAnalogSettings = {
  oscillators: DEFAULT_VIRTUAL_ANALOG_OSCILLATORS.map((oscillator) => ({ ...oscillator })),
  drift: 2.5,
  driftRate: 0.09,
  ringMod: 0,
  ringModPan: 0,
  sub: {
    enabled: true,
    waveform: 'square',
    octave: -1,
    detune: 0,
    level: 0.18,
    pan: 0,
  },
  noise: {
    enabled: false,
    type: 'pink',
    level: 0.08,
    pan: 0,
  },
};

interface VirtualAnalogSynthOptions extends MonophonicOptions, VirtualAnalogSettings {
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

interface OscillatorMemberNodes {
  oscillator: Tone.OmniOscillator<any>;
  ratio: Tone.Multiply;
  drift: Tone.Add;
  driftLfo: Tone.LFO;
  detune: Tone.Add;
  gain: Tone.Gain;
  panner: Tone.Panner;
}

interface OscillatorGroupNodes {
  members: OscillatorMemberNodes[];
  ringTap: Tone.Gain;
  pwmLfo: Tone.LFO;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function getVirtualAnalogFrequencyRatio(octave: number, semitone: number): number {
  return 2 ** (octave + semitone / 12);
}

export function getVirtualAnalogUnisonDetune(memberIndex: number, voiceCount: number, spreadCents: number): number {
  if (voiceCount <= 1) {
    return 0;
  }
  return ((memberIndex / (voiceCount - 1)) - 0.5) * spreadCents;
}

export function getVirtualAnalogUnisonPan(memberIndex: number, voiceCount: number, center: number, spread: number): number {
  if (voiceCount <= 1) {
    return clamp(center, -1, 1);
  }
  const position = ((memberIndex / (voiceCount - 1)) * 2) - 1;
  return clamp(center + position * spread, -1, 1);
}

export function shouldStartVirtualAnalogMember(
  settings: VirtualAnalogOscillatorSettings,
  memberIndex: number,
): boolean {
  const voiceCount = Math.max(1, Math.min(MAX_VIRTUAL_ANALOG_UNISON, Math.round(settings.unisonVoices)));
  return settings.enabled && memberIndex < voiceCount;
}

function pulseWidthToToneValue(width: number): number {
  return clamp(width, 0.05, 0.95) * 2 - 1;
}

export class VirtualAnalogSynth extends Monophonic<VirtualAnalogSynthOptions> {
  readonly name: string = 'VirtualAnalogSynth';
  readonly frequency: Tone.Signal<'frequency'>;
  readonly detune: Tone.Signal<'cents'>;
  readonly envelope: Tone.AmplitudeEnvelope;
  readonly pitchEnvelope: Tone.Envelope;

  protected readonly oscillatorGroups: OscillatorGroupNodes[];
  protected readonly subOscillator: Tone.OmniOscillator<any>;
  protected readonly noiseSource: Tone.Noise;
  private readonly pitchCents: Tone.Multiply;
  private readonly mix: Tone.Gain;
  private readonly subRatio: Tone.Multiply;
  private readonly subDetune: Tone.Add;
  private readonly subGain: Tone.Gain;
  private readonly subPanner: Tone.Panner;
  private readonly noiseGain: Tone.Gain;
  private readonly noisePanner: Tone.Panner;
  private readonly ringMultiply: Tone.Multiply;
  private readonly ringGain: Tone.Gain;
  private readonly ringPanner: Tone.Panner;
  private oscillatorSettings: VirtualAnalogOscillatorSettings[];
  private driftDepth: number;
  private driftRate: number;
  private pitchEnvelopeShape = 0;
  private sourceStartTime: number | null = null;
  private sourceStopTime: number | null = null;
  private silenceTimeout: number | null = null;

  constructor(options?: Partial<VirtualAnalogSynthOptions>) {
    const defaults = VirtualAnalogSynth.getDefaults();
    const merged = {
      ...defaults,
      ...options,
      envelope: { ...defaults.envelope, ...(options?.envelope ?? {}) },
      pitchEnvelope: { ...defaults.pitchEnvelope, ...(options?.pitchEnvelope ?? {}) },
      oscillators: defaults.oscillators.map((oscillator, index) => ({
        ...oscillator,
        ...(options?.oscillators?.[index] ?? {}),
      })),
      sub: { ...defaults.sub, ...(options?.sub ?? {}) },
      noise: { ...defaults.noise, ...(options?.noise ?? {}) },
    };
    super(merged);

    this.frequency = new Tone.Signal({ context: this.context, value: 440, units: 'frequency' });
    this.detune = new Tone.Signal({ context: this.context, value: merged.detune, units: 'cents' });
    this.envelope = new Tone.AmplitudeEnvelope({ context: this.context, ...merged.envelope });
    this.pitchEnvelope = new Tone.Envelope({ context: this.context, ...merged.pitchEnvelope });
    this.pitchCents = new Tone.Multiply({ context: this.context, value: merged.pitchEnvelopeAmount * 100 });
    this.mix = new Tone.Gain({ context: this.context, gain: 0.72 });
    this.oscillatorSettings = merged.oscillators;
    this.driftDepth = merged.drift;
    this.driftRate = merged.driftRate;

    this.pitchEnvelope.chain(this.pitchCents, this.detune);
    this.mix.chain(this.envelope, this.output);

    this.oscillatorGroups = this.oscillatorSettings.map((settings, oscillatorIndex) => {
      const ringTap = new Tone.Gain({ context: this.context, gain: 1 });
      const pwmLfo = new Tone.LFO({
        context: this.context,
        frequency: settings.pwmRate,
        min: pulseWidthToToneValue(settings.pulseWidth - settings.pwmDepth),
        max: pulseWidthToToneValue(settings.pulseWidth + settings.pwmDepth),
        phase: oscillatorIndex * 120 + 23,
        type: 'sine',
      }).start();
      return { members: [], ringTap, pwmLfo };
    });

    this.ringMultiply = new Tone.Multiply({ context: this.context, value: 0 });
    this.ringGain = new Tone.Gain({ context: this.context, gain: merged.ringMod });
    this.ringPanner = new Tone.Panner({ context: this.context, pan: merged.ringModPan });
    this.oscillatorGroups[0].ringTap.connect(this.ringMultiply);
    this.oscillatorGroups[1].ringTap.connect(this.ringMultiply.factor);
    this.ringMultiply.chain(this.ringGain, this.ringPanner, this.mix);

    this.subRatio = new Tone.Multiply({ context: this.context, value: 0.5 });
    this.subDetune = new Tone.Add({ context: this.context, value: merged.sub.detune });
    this.subOscillator = new Tone.OmniOscillator({
      context: this.context,
      type: merged.sub.waveform,
      frequency: 0,
      phase: 0,
    });
    this.subGain = new Tone.Gain({ context: this.context, gain: merged.sub.enabled ? merged.sub.level : 0 });
    this.subPanner = new Tone.Panner({ context: this.context, pan: merged.sub.pan });
    this.frequency.chain(this.subRatio, this.subOscillator.frequency);
    this.detune.chain(this.subDetune, this.subOscillator.detune);
    this.subOscillator.chain(this.subGain, this.subPanner, this.mix);

    this.noiseSource = new Tone.Noise({ context: this.context, type: merged.noise.type, fadeIn: 0.002, fadeOut: 0.005 });
    this.noiseGain = new Tone.Gain({ context: this.context, gain: merged.noise.enabled ? merged.noise.level : 0 });
    this.noisePanner = new Tone.Panner({ context: this.context, pan: merged.noise.pan });
    this.noiseSource.chain(this.noiseGain, this.noisePanner, this.mix);

    this.pitchEnvelopeShape = merged.pitchEnvelopeShape;
    this.applyPitchEnvelopeShape();
    this.applySettings(merged);
  }

  static getDefaults(): VirtualAnalogSynthOptions {
    return {
      ...Monophonic.getDefaults(),
      envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.2 },
      pitchEnvelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.2 },
      pitchEnvelopeAmount: 0,
      pitchEnvelopeShape: 0,
      ...DEFAULT_VIRTUAL_ANALOG_SETTINGS,
      oscillators: DEFAULT_VIRTUAL_ANALOG_SETTINGS.oscillators.map((oscillator) => ({ ...oscillator })),
      sub: { ...DEFAULT_VIRTUAL_ANALOG_SETTINGS.sub },
      noise: { ...DEFAULT_VIRTUAL_ANALOG_SETTINGS.noise },
    };
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

  private createOscillatorMember(
    settings: VirtualAnalogOscillatorSettings,
    oscillatorIndex: number,
    memberIndex: number,
  ): OscillatorMemberNodes {
    const ratio = new Tone.Multiply({ context: this.context, value: 1 });
    const drift = new Tone.Add({ context: this.context, value: 0 });
    const driftLfo = new Tone.LFO({
      context: this.context,
      frequency: this.driftRate * (1 + oscillatorIndex * 0.071 + memberIndex * 0.037),
      min: -this.driftDepth,
      max: this.driftDepth,
      phase: (oscillatorIndex * 137 + memberIndex * 83 + 37) % 360,
      type: 'sine',
    }).start();
    const memberDetune = new Tone.Add({ context: this.context, value: 0 });
    const oscillator = new Tone.OmniOscillator({
      context: this.context,
      type: settings.waveform,
      frequency: 0,
      phase: settings.phase + memberIndex * 17,
    });
    const gain = new Tone.Gain({ context: this.context, gain: 0 });
    const panner = new Tone.Panner({ context: this.context, pan: 0 });
    this.frequency.chain(ratio, oscillator.frequency);
    this.detune.chain(drift, memberDetune, oscillator.detune);
    driftLfo.connect(drift.addend);
    oscillator.chain(gain, panner, this.mix);
    gain.connect(this.oscillatorGroups[oscillatorIndex].ringTap);
    return { oscillator, ratio, drift, driftLfo, detune: memberDetune, gain, panner };
  }

  private ensureOscillatorMembers(settings: VirtualAnalogOscillatorSettings, oscillatorIndex: number): void {
    const voiceCount = settings.enabled
      ? Math.max(1, Math.min(MAX_VIRTUAL_ANALOG_UNISON, Math.round(settings.unisonVoices)))
      : 0;
    const members = this.oscillatorGroups[oscillatorIndex].members;
    while (members.length < voiceCount) {
      members.push(this.createOscillatorMember(settings, oscillatorIndex, members.length));
    }
  }

  private applyOscillatorSettings(settings: VirtualAnalogOscillatorSettings, oscillatorIndex: number): void {
    const group = this.oscillatorGroups[oscillatorIndex];
    const voiceCount = Math.max(1, Math.min(MAX_VIRTUAL_ANALOG_UNISON, Math.round(settings.unisonVoices)));
    const activeGain = settings.enabled ? settings.level / Math.sqrt(voiceCount) : 0;
    const ratio = getVirtualAnalogFrequencyRatio(settings.octave, settings.semitone);
    this.ensureOscillatorMembers(settings, oscillatorIndex);

    group.pwmLfo.disconnect();
    group.pwmLfo.set({
      frequency: settings.pwmRate,
      min: pulseWidthToToneValue(settings.pulseWidth - settings.pwmDepth),
      max: pulseWidthToToneValue(settings.pulseWidth + settings.pwmDepth),
    });
    group.members.forEach((member, memberIndex) => {
      member.oscillator.type = settings.waveform as OmniOscillatorType;
      member.oscillator.phase = (settings.phase + memberIndex * 17) % 360;
      member.ratio.value = ratio;
      member.detune.addend.value = settings.detune
        + getVirtualAnalogUnisonDetune(memberIndex, voiceCount, settings.unisonDetune);
      member.gain.gain.value = memberIndex < voiceCount ? activeGain : 0;
      member.panner.pan.value = getVirtualAnalogUnisonPan(
        memberIndex,
        voiceCount,
        settings.pan,
        settings.stereoSpread,
      );
      if (settings.waveform === 'pulse') {
        const width = member.oscillator.width as Tone.Signal<'audioRange'>;
        group.pwmLfo.connect(width);
      }
    });
  }

  private applySettings(settings: Partial<VirtualAnalogSettings>): void {
    if (settings.oscillators) {
      this.oscillatorSettings = this.oscillatorSettings.map((oscillator, index) => ({
        ...oscillator,
        ...(settings.oscillators?.[index] ?? {}),
      }));
      this.oscillatorSettings.forEach((oscillator, index) => this.applyOscillatorSettings(oscillator, index));
    }
    if (typeof settings.drift === 'number' || typeof settings.driftRate === 'number') {
      this.driftDepth = settings.drift ?? this.driftDepth;
      this.driftRate = settings.driftRate ?? this.driftRate;
      this.oscillatorGroups.forEach((group, oscillatorIndex) => group.members.forEach((member, memberIndex) => {
        member.driftLfo.set({
          frequency: this.driftRate * (1 + oscillatorIndex * 0.071 + memberIndex * 0.037),
          min: -this.driftDepth,
          max: this.driftDepth,
        });
      }));
    }
    if (typeof settings.ringMod === 'number') {
      this.ringGain.gain.value = settings.ringMod;
    }
    if (typeof settings.ringModPan === 'number') {
      this.ringPanner.pan.value = settings.ringModPan;
    }
    if (settings.sub) {
      this.subOscillator.type = settings.sub.waveform as OmniOscillatorType;
      this.subRatio.value = 2 ** settings.sub.octave;
      this.subDetune.addend.value = settings.sub.detune;
      this.subGain.gain.value = settings.sub.enabled ? settings.sub.level : 0;
      this.subPanner.pan.value = settings.sub.pan;
    }
    if (settings.noise) {
      this.noiseSource.type = settings.noise.type;
      this.noiseGain.gain.value = settings.noise.enabled ? settings.noise.level : 0;
      this.noisePanner.pan.value = settings.noise.pan;
    }
  }

  set(props: Partial<VirtualAnalogSynthOptions>): this {
    const now = this.now();
    const lifecycleScheduled = this.sourceStartTime !== null
      && (this.sourceStopTime === null || now < this.sourceStopTime);
    const startsInFuture = lifecycleScheduled && now < this.sourceStartTime!;
    if (startsInFuture) {
      this.stopAudibleSources(now);
    } else if (lifecycleScheduled && this.sourceStopTime !== null) {
      this.restartAudibleSources(now);
    }
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
    this.applySettings(props);
    if (lifecycleScheduled) {
      const admissionTime = Math.max(now, this.sourceStartTime!);
      this.startAudibleSources(admissionTime);
      if (this.sourceStopTime !== null) {
        this.stopAudibleSources(this.sourceStopTime);
      }
    }
    return this;
  }

  private startAudibleSources(time: number): void {
    this.oscillatorGroups.forEach((group, oscillatorIndex) => group.members.forEach((member, memberIndex) => {
      if (member.oscillator.state !== 'started'
        && shouldStartVirtualAnalogMember(this.oscillatorSettings[oscillatorIndex], memberIndex)) {
        member.oscillator.start(time);
      }
    }));
    if (this.subGain.gain.value > 0 && this.subOscillator.state !== 'started') {
      this.subOscillator.start(time);
    }
    if (this.noiseGain.gain.value > 0 && this.noiseSource.state !== 'started') {
      this.noiseSource.start(time);
    }
  }

  private stopAudibleSources(time: number): void {
    this.oscillatorGroups.forEach((group) => group.members.forEach((member) => member.oscillator.stop(time)));
    this.subOscillator.stop(time);
    this.noiseSource.stop(time);
  }

  private restartAudibleSources(time: number): void {
    this.oscillatorGroups.forEach((group) => group.members.forEach((member) => {
      if (member.oscillator.state === 'started') {
        member.oscillator.restart(time);
      }
    }));
    if (this.subGain.gain.value > 0 && this.subOscillator.state === 'started') {
      this.subOscillator.restart(time);
    }
    if (this.noiseGain.gain.value > 0 && this.noiseSource.state === 'started') {
      this.noiseSource.restart(time);
    }
  }

  private clearSilenceTimeout(): void {
    if (this.silenceTimeout !== null) {
      this.context.clearTimeout(this.silenceTimeout);
      this.silenceTimeout = null;
    }
  }

  private completeRelease(): void {
    this.stopAudibleSources(this.now());
    this.sourceStartTime = null;
    this.sourceStopTime = null;
    this.silenceTimeout = null;
    this.onsilence(this);
  }

  protected startSources(time: number): void {
    this.sourceStartTime = time;
    this.startAudibleSources(time);
  }

  protected stopSources(time: number): void {
    this.sourceStopTime = time;
    this.stopAudibleSources(time);
    this.clearSilenceTimeout();
    this.silenceTimeout = this.context.setTimeout(
      () => this.completeRelease(),
      Math.max(0, time - this.now()),
    );
  }

  protected _triggerEnvelopeAttack(time: number, velocity: number): void {
    if (this.sourceStopTime !== null) {
      this.clearSilenceTimeout();
      this.restartAudibleSources(time);
    }
    this.sourceStopTime = null;
    this.startSources(time);
    this.envelope.triggerAttack(time, velocity);
    this.pitchEnvelope.triggerAttack(time);
  }

  protected _triggerEnvelopeRelease(time: number): void {
    this.envelope.triggerRelease(time);
    this.pitchEnvelope.triggerRelease(time);
    const release = Math.max(this.toSeconds(this.envelope.release), this.toSeconds(this.pitchEnvelope.release));
    this.stopSources(time + release);
  }

  getLevelAtTime(time: Tone.Unit.Time): Tone.Unit.NormalRange {
    return this.envelope.getValueAtTime(this.toSeconds(time));
  }

  dispose(): this {
    this.clearSilenceTimeout();
    this.oscillatorGroups.forEach((group) => {
      group.members.forEach((member) => {
        member.oscillator.dispose();
        member.ratio.dispose();
        member.drift.dispose();
        member.driftLfo.dispose();
        member.detune.dispose();
        member.gain.dispose();
        member.panner.dispose();
      });
      group.ringTap.dispose();
      group.pwmLfo.dispose();
    });
    this.frequency.dispose();
    this.detune.dispose();
    this.envelope.dispose();
    this.pitchEnvelope.dispose();
    this.pitchCents.dispose();
    this.mix.dispose();
    this.ringMultiply.dispose();
    this.ringGain.dispose();
    this.ringPanner.dispose();
    this.subOscillator.dispose();
    this.subRatio.dispose();
    this.subDetune.dispose();
    this.subGain.dispose();
    this.subPanner.dispose();
    this.noiseSource.dispose();
    this.noiseGain.dispose();
    this.noisePanner.dispose();
    return super.dispose();
  }
}

export class MonoVirtualAnalogSynth extends VirtualAnalogSynth {
  readonly name: string = 'MonoVirtualAnalogSynth';

  private glideSettings: GlideSettings = { ...DEFAULT_GLIDE_SETTINGS };
  private readonly glideState = createMonoGlideState();
  private pendingGlide: GlidePlan | null = null;
  private sourcesRunning = false;

  setGlide(settings: GlideSettings): void {
    this.glideSettings = { ...settings };
  }

  resetGlide(): void {
    resetMonoGlideState(this.glideState);
    this.pendingGlide = null;
    if (this.sourcesRunning) {
      this.sourcesRunning = false;
      super.stopSources(this.now());
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

  protected startSources(time: number): void {
    this.sourcesRunning = true;
    super.startSources(time);
  }

  protected stopSources(_time: number): void {
    // Sources free-run so true legato can move pitch without restarting phase.
  }

  dispose(): this {
    if (this.sourcesRunning) {
      this.sourcesRunning = false;
      super.stopSources(this.now());
    }
    return super.dispose();
  }
}