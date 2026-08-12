export const CHOIR_FORMANT_GAIN_COMPENSATION_DB = 12;

/**
 * Choir vowel banks use many negative-dB formant peaks to keep the spectrum balanced.
 * The synth path still needs a modest +12 dB lift so the resulting vowel stack remains
 * audible across the mix and does not vanish behind other oscillator waveforms.
 */
export function getChoirFormantBandGainLinear(gainDb: number): number {
  return Math.pow(10, (gainDb + CHOIR_FORMANT_GAIN_COMPENSATION_DB) / 20);
}
