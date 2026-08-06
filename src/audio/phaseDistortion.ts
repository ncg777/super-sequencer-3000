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
 * Largest warp depth used by the kernel. Kept below 1 so the warp stays strictly
 * monotonic (its derivative 1 + depth * sin(2*pi*p) never reaches zero).
 */
export const SKEW_WARP_MAX_DEPTH = 0.999;

/** Map skew in (0, 1) onto the signed warp depth. skew = 0.5 gives depth 0 (identity). */
export function skewToWarpDepth(skew: number): number {
  return (1 - 2 * clampSkewSafe(skew)) * SKEW_WARP_MAX_DEPTH;
}

/**
 * Warp a linear phase accumulator in [0, 1) with a smooth, branchless kernel:
 *   f(p) = p + depth * (1 - cos(2*pi*p)) / (2*pi)
 * It is continuous in every derivative, including across the phase wrap
 * (f(0) = 0, f(1) = 1, f'(0) = f'(1) = 1), so modulating skew cannot introduce
 * the slope discontinuity that the old piecewise-linear model produced.
 * skew = 0.5 is neutral (identity); values below/above 0.5 tilt the waveform.
 */
export function warpPhase(phase: number, skew: number): number {
  // Wrap phase into [0, 1) without branching on typical in-range inputs.
  const p = phase - Math.floor(phase);
  const depth = skewToWarpDepth(skew);
  const warped = p + (depth * (1 - Math.cos(2 * Math.PI * p))) / (2 * Math.PI);
  return warped - Math.floor(warped);
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
