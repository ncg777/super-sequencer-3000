import * as Tone from 'tone';
import { buildPitchEnvelopeCurve } from './pitchEnvelope';

type SynthOptions = Tone.SynthOptions;

export interface PitchEnvelopeSynthOptions extends SynthOptions {
  pitchEnvelope: {
    attack: Tone.Unit.Time;
    decay: Tone.Unit.Time;
    sustain: Tone.Unit.NormalRange;
    release: Tone.Unit.Time;
  };
  /** Pitch modulation depth in MIDI pitches (converted to cents on the detune bus). */
  pitchEnvelopeAmount: number;
  /** Exponential steepness for pitch envelope segments (0 = linear). */
  pitchEnvelopeShape: number;
}

/**
 * Tone.Synth voice with a per-note ADSR pitch envelope summed into detune (cents).
 * Used by PolySynth so each voice gets independent pitch-envelope state.
 */
export class PitchEnvelopeSynth extends Tone.Synth {
  readonly name = 'PitchEnvelopeSynth';

  readonly pitchEnvelope: Tone.Envelope;
  private readonly pitchCents: Tone.Multiply;
  private _pitchEnvelopeAmount = 0;
  private _pitchEnvelopeShape = 0;

  constructor(options?: Partial<PitchEnvelopeSynthOptions>) {
    const defaults = PitchEnvelopeSynth.getDefaults();
    const mergedPitchEnvelope = {
      ...defaults.pitchEnvelope,
      ...(options?.pitchEnvelope ?? {}),
    };
    super({
      ...defaults,
      ...options,
      envelope: {
        ...defaults.envelope,
        ...(options?.envelope ?? {}),
      },
      oscillator: {
        ...defaults.oscillator,
        ...(options?.oscillator ?? {}),
      },
    });

    this.pitchEnvelope = new Tone.Envelope({
      context: this.context,
      attack: mergedPitchEnvelope.attack,
      decay: mergedPitchEnvelope.decay,
      sustain: mergedPitchEnvelope.sustain,
      release: mergedPitchEnvelope.release,
      attackCurve: 'linear',
      decayCurve: 'linear',
      releaseCurve: 'linear',
    });
    this.pitchCents = new Tone.Multiply({
      context: this.context,
      value: 0,
    });
    this.pitchEnvelope.connect(this.pitchCents);
    this.pitchCents.connect(this.detune);
    this.pitchEnvelopeAmount = options?.pitchEnvelopeAmount ?? defaults.pitchEnvelopeAmount;
    this.pitchEnvelopeShape = options?.pitchEnvelopeShape ?? defaults.pitchEnvelopeShape;
  }

  static getDefaults(): PitchEnvelopeSynthOptions {
    return Object.assign(Tone.Synth.getDefaults(), {
      pitchEnvelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0,
        release: 0.2,
      },
      pitchEnvelopeAmount: 0,
      pitchEnvelopeShape: 0,
    });
  }

  get pitchEnvelopeAmount(): number {
    return this._pitchEnvelopeAmount;
  }

  set pitchEnvelopeAmount(amount: number) {
    this._pitchEnvelopeAmount = amount;
    // Envelope is 0-1; scale to cents so 1 MIDI pitch = 100 cents.
    this.pitchCents.value = amount * 100;
  }

  get pitchEnvelopeShape(): number {
    return this._pitchEnvelopeShape;
  }

  set pitchEnvelopeShape(shape: number) {
    this._pitchEnvelopeShape = shape;
    this.applyPitchEnvelopeShape(shape);
  }

  /** Apply numeric exponential steepness as custom Tone envelope curves. */
  applyPitchEnvelopeShape(shape: number) {
    if (shape < 1e-6) {
      this.pitchEnvelope.attackCurve = 'linear';
      this.pitchEnvelope.decayCurve = 'linear';
      this.pitchEnvelope.releaseCurve = 'linear';
      return;
    }

    const curve = buildPitchEnvelopeCurve(shape);
    // Attack rises with the curve; release falls with the reversed curve.
    // Tone decayCurve only supports linear/exponential, so use exponential for non-zero shape.
    this.pitchEnvelope.attackCurve = curve;
    this.pitchEnvelope.decayCurve = 'exponential';
    this.pitchEnvelope.releaseCurve = curve.slice().reverse();
  }

  set(props: Partial<PitchEnvelopeSynthOptions>): this {
    const { pitchEnvelope, pitchEnvelopeAmount, pitchEnvelopeShape, ...rest } = props;
    if (Object.keys(rest).length > 0) {
      super.set(rest);
    }
    if (pitchEnvelope) {
      this.pitchEnvelope.set(pitchEnvelope);
    }
    if (typeof pitchEnvelopeAmount === 'number') {
      this.pitchEnvelopeAmount = pitchEnvelopeAmount;
    }
    if (typeof pitchEnvelopeShape === 'number') {
      this.pitchEnvelopeShape = pitchEnvelopeShape;
    }
    return this;
  }

  protected _triggerEnvelopeAttack(time: number, velocity: number): void {
    super._triggerEnvelopeAttack(time, velocity);
    this.pitchEnvelope.triggerAttack(time);
  }

  protected _triggerEnvelopeRelease(time: number): void {
    super._triggerEnvelopeRelease(time);
    this.pitchEnvelope.triggerRelease(time);
  }

  dispose(): this {
    this.pitchEnvelope.dispose();
    this.pitchCents.dispose();
    return super.dispose();
  }
}
