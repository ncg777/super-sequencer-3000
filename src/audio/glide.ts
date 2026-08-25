export const GLIDE_MODE_OPTIONS = ['legato', 'always'] as const;
export type GlideMode = typeof GLIDE_MODE_OPTIONS[number];

export const GLIDE_CURVE_OPTIONS = ['exponential', 'linear'] as const;
export type GlideCurve = typeof GLIDE_CURVE_OPTIONS[number];

export interface GlideSettings {
  /** Glide time in seconds, or seconds per octave when constantRate is set. 0 disables glide. */
  time: number;
  /** 'legato' only glides between overlapping notes; 'always' glides between every note. */
  mode: GlideMode;
  /** Constant-rate glide, so wide leaps take proportionally longer than small ones. */
  constantRate: boolean;
  curve: GlideCurve;
  /** True legato: overlapping notes keep the running envelopes and only move the pitch. */
  legato: boolean;
}

export const DEFAULT_GLIDE_SETTINGS: GlideSettings = {
  time: 0,
  mode: 'legato',
  constantRate: false,
  curve: 'exponential',
  legato: true,
};

/** Rolling pitch memory of a single monophonic voice. */
export interface MonoGlideState {
  frequency: number | null;
  noteEndTime: number;
}

export interface GlidePlan {
  fromFrequency: number;
  toFrequency: number;
  /** Ramp length in seconds; 0 means the pitch jumps at the note start. */
  seconds: number;
  curve: GlideCurve;
  /** The previous note was still sounding when this one started. */
  legato: boolean;
}

/** Overlap shorter than this is scheduling jitter rather than a played legato. */
const LEGATO_TOLERANCE_SECONDS = 0.001;
/** Ramps below this are inaudible, so they collapse into an instant pitch change. */
const MINIMUM_GLIDE_SECONDS = 0.0005;

export function createMonoGlideState(): MonoGlideState {
  return { frequency: null, noteEndTime: Number.NEGATIVE_INFINITY };
}

export function resetMonoGlideState(state: MonoGlideState): void {
  state.frequency = null;
  state.noteEndTime = Number.NEGATIVE_INFINITY;
}

/** Highest-note priority: a chord wider than the voice count keeps its top pitches. */
export function limitPolyphony(values: readonly number[], polyphony: number): number[] {
  const limit = Math.max(1, Math.floor(polyphony));
  if (values.length <= limit) {
    return values.slice();
  }
  return values.slice().sort((left, right) => right - left).slice(0, limit);
}

export function isMonophonic(polyphony: number): boolean {
  return polyphony <= 1;
}

/**
 * Resolve the glide for the next monophonic note and advance the voice state.
 * Must be called once per note, in playback order.
 */
export function planMonoGlide(
  state: MonoGlideState,
  targetFrequency: number,
  startTime: number,
  endTime: number,
  settings: GlideSettings,
): GlidePlan {
  const fromFrequency = state.frequency;
  const legato = fromFrequency !== null && startTime < state.noteEndTime - LEGATO_TOLERANCE_SECONDS;

  let seconds = 0;
  if (fromFrequency !== null
    && fromFrequency > 0
    && targetFrequency > 0
    && settings.time > 0
    && (settings.mode === 'always' || legato)) {
    const octaves = Math.abs(Math.log2(targetFrequency / fromFrequency));
    seconds = settings.constantRate ? settings.time * octaves : settings.time;
    // A glide never outlives the note it belongs to, otherwise the target pitch is never reached.
    seconds = Math.min(seconds, Math.max(0, endTime - startTime));
    if (seconds < MINIMUM_GLIDE_SECONDS) {
      seconds = 0;
    }
  }

  state.frequency = targetFrequency;
  state.noteEndTime = endTime;

  return {
    fromFrequency: fromFrequency ?? targetFrequency,
    toFrequency: targetFrequency,
    seconds,
    curve: settings.curve,
    legato,
  };
}

/**
 * Frequency of an in-progress glide, matching the Web Audio ramp shapes so the
 * offline renderers stay in sync with the live Tone graph.
 */
export function getGlideFrequency(plan: GlidePlan, elapsedSeconds: number): number {
  if (plan.seconds <= 0 || elapsedSeconds >= plan.seconds) {
    return plan.toFrequency;
  }

  const progress = Math.max(0, elapsedSeconds) / plan.seconds;
  return plan.curve === 'linear'
    ? plan.fromFrequency + (plan.toFrequency - plan.fromFrequency) * progress
    : plan.fromFrequency * Math.pow(plan.toFrequency / plan.fromFrequency, progress);
}
