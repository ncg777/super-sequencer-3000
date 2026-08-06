/** Phase-distortion (waveform skew/tilt) helpers shared by live and offline engines. */

export const SKEW_MIN = 0.01;
export const SKEW_MAX = 0.99;
export const SKEW_DEFAULT = 0.5;
/** Internal clamp used by the warp kernel to avoid division by zero. */
export const SKEW_SAFE_MIN = 0.001;
export const SKEW_SAFE_MAX = 0.999;

export function clampSkew(skew: number): number {
  if (!Number.isFinite(skew)) {
    return SKEW_DEFAULT;
  }
  if (skew < SKEW_MIN) {
    return SKEW_MIN;
  }
  if (skew > SKEW_MAX) {
    return SKEW_MAX;
  }
  return skew;
}

export function clampSkewSafe(skew: number): number {
  if (!Number.isFinite(skew)) {
    return SKEW_DEFAULT;
  }
  if (skew < SKEW_SAFE_MIN) {
    return SKEW_SAFE_MIN;
  }
  if (skew > SKEW_SAFE_MAX) {
    return SKEW_SAFE_MAX;
  }
  return skew;
}

/**
 * Warp a linear phase accumulator in [0, 1) through an inflection point (skew).
 * skew = 0.5 is neutral (identity). Values below/above 0.5 tilt the waveform.
 */
export function warpPhase(phase: number, skew: number): number {
  // Wrap phase into [0, 1) without branching on typical in-range inputs.
  const p = phase - Math.floor(phase);
  const s = clampSkewSafe(skew);
  if (p < s) {
    return p / (2 * s);
  }
  return 0.5 + (p - s) / (2 * (1 - s));
}

/**
 * Map an LFO sample in [-1, 1] onto base skew.
 * effectiveSkew = clamp(baseSkew + lfoOutput * lfoAmount, safe range)
 */
export function effectiveSkew(baseSkew: number, lfoOutput: number, lfoAmount: number): number {
  const amount = Number.isFinite(lfoAmount) ? lfoAmount : 0;
  const lfo = Number.isFinite(lfoOutput) ? lfoOutput : 0;
  return clampSkewSafe(baseSkew + lfo * amount);
}
