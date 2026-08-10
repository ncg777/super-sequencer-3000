/** Pitch envelope shape (exponential steepness). 0 is linear; higher values are steeper. */
export const PITCH_ENVELOPE_SHAPE_MIN = 0;
export const PITCH_ENVELOPE_SHAPE_MAX = 10;
export const DEFAULT_PITCH_ENVELOPE_SHAPE = 0;

/** Sample count for Tone custom envelope curves generated from shape. */
const PITCH_ENVELOPE_CURVE_SAMPLES = 64;

export function clampPitchEnvelopeShape(value: number): number {
  return Math.min(PITCH_ENVELOPE_SHAPE_MAX, Math.max(PITCH_ENVELOPE_SHAPE_MIN, value));
}

export function normalizePitchEnvelopeShape(value: unknown, fallback = DEFAULT_PITCH_ENVELOPE_SHAPE): number {
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && value.trim() !== ''
      ? Number(value)
      : Number.NaN;
  if (!Number.isFinite(numeric)) {
    return clampPitchEnvelopeShape(fallback);
  }
  return clampPitchEnvelopeShape(numeric);
}

/**
 * Convert a 0-1 segment progress into a shaped 0-1 level.
 * shape = 0 → linear; larger shape → steeper exponential curve.
 * Uses (e^(k t) - 1) / (e^k - 1) so the endpoints stay at 0 and 1.
 */
export function shapeEnvelopeProgress(progress: number, shape: number): number {
  const clamped = Math.max(0, Math.min(1, progress));
  const k = clampPitchEnvelopeShape(shape);
  if (k < 1e-6) {
    return clamped;
  }
  return (Math.exp(k * clamped) - 1) / (Math.exp(k) - 1);
}

/** Build a Tone setValueCurveAtTime-compatible curve for the given steepness. */
export function buildPitchEnvelopeCurve(shape: number): number[] {
  const curve: number[] = [];
  for (let i = 0; i < PITCH_ENVELOPE_CURVE_SAMPLES; i += 1) {
    curve.push(shapeEnvelopeProgress(i / (PITCH_ENVELOPE_CURVE_SAMPLES - 1), shape));
  }
  return curve;
}

export interface PitchEnvelopeParams {
  pitchEnvelopeAttack: number;
  pitchEnvelopeDecay: number;
  pitchEnvelopeSustain: number;
  pitchEnvelopeRelease: number;
  pitchEnvelopeAmount: number;
  /** Exponential steepness (0 = linear). */
  pitchEnvelopeShape: number;
}

/** ADSR level before release for a pitch envelope (0-1). */
export function getPitchEnvelopePreReleaseLevel(track: PitchEnvelopeParams, elapsed: number): number {
  const attack = Math.max(0, track.pitchEnvelopeAttack);
  if (elapsed < attack && attack > 0) {
    return shapeEnvelopeProgress(elapsed / attack, track.pitchEnvelopeShape);
  }

  const decay = Math.max(0, track.pitchEnvelopeDecay);
  const decayElapsed = elapsed - attack;
  if (decayElapsed < decay && decay > 0) {
    const decayProgress = shapeEnvelopeProgress(decayElapsed / decay, track.pitchEnvelopeShape);
    return 1 - (decayProgress * (1 - track.pitchEnvelopeSustain));
  }

  return track.pitchEnvelopeSustain;
}

/** Full ADSR pitch-envelope level at `elapsed` seconds into a note of `noteDuration` seconds. */
export function getPitchEnvelopeLevel(track: PitchEnvelopeParams, elapsed: number, noteDuration: number): number {
  if (track.pitchEnvelopeAmount === 0) {
    return 0;
  }

  const gateDuration = Math.max(0, noteDuration);
  const safeElapsed = Math.max(0, elapsed);
  const preReleaseLevel = getPitchEnvelopePreReleaseLevel(track, Math.min(safeElapsed, gateDuration));
  if (safeElapsed <= gateDuration) {
    return preReleaseLevel;
  }

  const release = Math.max(0, track.pitchEnvelopeRelease);
  if (release <= 0) {
    return 0;
  }

  const releaseProgress = shapeEnvelopeProgress((safeElapsed - gateDuration) / release, track.pitchEnvelopeShape);
  return preReleaseLevel * Math.max(0, 1 - releaseProgress);
}

/** Pitch offset in MIDI note units from a 0-1 envelope level. */
export function getPitchEnvelopeMidiOffset(track: PitchEnvelopeParams, envelopeLevel: number): number {
  return track.pitchEnvelopeAmount * envelopeLevel;
}

/** Pitch offset in cents for Tone.Signal<"cents"> automation. */
export function getPitchEnvelopeCents(track: PitchEnvelopeParams, envelopeLevel: number): number {
  return getPitchEnvelopeMidiOffset(track, envelopeLevel) * 100;
}
