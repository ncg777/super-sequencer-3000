export const FLUTE_HARMONICS = [1, 0.25, 0.1, 0.04, 0.02] as const;

export const PULSE_DUTY = {
  'pulse-25': 0.25,
  'pulse-12': 0.125,
} as const;

export type PulseWaveform = keyof typeof PULSE_DUTY;

export const BREATH_FILTER_Q = 2;

export function getFluteHarmonicAmplitude(harmonic: number): number {
  return harmonic > 0 ? FLUTE_HARMONICS[harmonic - 1] ?? 0 : 0;
}

export function isPulseWaveform(waveform: string): waveform is PulseWaveform {
  return waveform in PULSE_DUTY;
}

export function getPulseHarmonicAmplitude(duty: number, harmonic: number): number {
  return harmonic > 0 ? Math.sin(Math.PI * harmonic * duty) / harmonic : 0;
}