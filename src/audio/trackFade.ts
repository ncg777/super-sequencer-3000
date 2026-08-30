export interface TrackFadeEnvelopePoint {
  time: number;
  gain: number;
}

function clampNormal(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function getTrackFadeGain(
  elapsedSeconds: number,
  activeDurationSeconds: number,
  fadeInSeconds: number,
  fadeOutSeconds: number,
): number {
  const fadeInGain = fadeInSeconds > 0 ? clampNormal(elapsedSeconds / fadeInSeconds) : 1;
  const fadeOutGain = fadeOutSeconds > 0
    ? clampNormal((activeDurationSeconds - elapsedSeconds) / fadeOutSeconds)
    : 1;
  return Math.min(fadeInGain, fadeOutGain);
}

export function buildTrackFadeEnvelope(
  activeDurationSeconds: number,
  fadeInSeconds: number,
  fadeOutSeconds: number,
): TrackFadeEnvelopePoint[] {
  const duration = Math.max(0, activeDurationSeconds);
  const fadeIn = Math.max(0, fadeInSeconds);
  const fadeOut = Math.max(0, fadeOutSeconds);
  if (duration === 0 || (fadeIn === 0 && fadeOut === 0)) {
    return [];
  }

  const candidateTimes = new Set<number>([0, duration]);
  if (fadeIn > 0 && fadeIn < duration) {
    candidateTimes.add(fadeIn);
  }
  if (fadeOut > 0 && fadeOut < duration) {
    candidateTimes.add(duration - fadeOut);
  }
  if (fadeIn > 0 && fadeOut > 0) {
    const intersection = duration * fadeIn / (fadeIn + fadeOut);
    if (intersection > 0 && intersection < duration) {
      candidateTimes.add(intersection);
    }
  }

  const points = [...candidateTimes]
    .sort((left, right) => left - right)
    .map((time) => ({
      time,
      gain: getTrackFadeGain(time, duration, fadeIn, fadeOut),
    }));

  return points.filter((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return true;
    }
    const previous = points[index - 1];
    const next = points[index + 1];
    const previousSlope = (point.gain - previous.gain) / (point.time - previous.time);
    const nextSlope = (next.gain - point.gain) / (next.time - point.time);
    return Math.abs(previousSlope - nextSlope) > 1e-12;
  });
}