export const MAX_WAVETABLE_DIMENSIONS = 16;
export const MAX_WAVETABLE_CONFIGURATIONS = 64;

export interface TonewheelWavetableDimension {
  name: string;
  value: number;
}

export interface TonewheelConfiguration {
  name: string;
  position: number[];
  drawbars: number[];
}

export interface TonewheelWavetable {
  enabled: boolean;
  dimensions: TonewheelWavetableDimension[];
  configurations: TonewheelConfiguration[];
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Shepard interpolation supports sparse configurations in any number of
 * dimensions without forcing users to author every corner of a hypercube.
 */
export function interpolateTonewheelDrawbars(
  wavetable: TonewheelWavetable,
  fallback: number[],
): number[] {
  if (!wavetable.enabled || wavetable.dimensions.length === 0 || wavetable.configurations.length === 0) {
    return fallback.slice();
  }

  const point = wavetable.dimensions.map((dimension) => clampUnit(dimension.value));
  const distances = wavetable.configurations.map((configuration) => {
    const squaredDistance = point.reduce((sum, value, index) => {
      const delta = value - clampUnit(configuration.position[index] ?? 0);
      return sum + delta * delta;
    }, 0);
    return Math.sqrt(squaredDistance);
  });
  const exactIndex = distances.findIndex((distance) => distance < 1e-9);
  if (exactIndex >= 0) {
    return wavetable.configurations[exactIndex].drawbars.slice();
  }

  const weights = distances.map((distance) => 1 / (distance * distance));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return fallback.map((fallbackValue, drawbarIndex) => (
    wavetable.configurations.reduce(
      (sum, configuration, index) => sum + (configuration.drawbars[drawbarIndex] ?? fallbackValue) * weights[index],
      0,
    ) / totalWeight
  ));
}
