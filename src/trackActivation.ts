/**
 * Song-level track activation masks (sequence B).
 *
 * B is a whitespace-separated sequence of nonnegative decimal bitmasks.
 * Blank input disables gating. When populated, its N masks divide the full
 * song loop into N equal wall-clock chunks. Bit 0 controls the first track,
 * bit 1 the second, and so on. Activation is decided by final note onset;
 * active notes are clipped at the first subsequent inactive chunk boundary.
 */

export interface BitmaskSequenceParseResult {
  /** Normalized whitespace-separated decimal text, or blank when disabled. */
  normalizedInput: string;
  /** Parsed masks; empty means gating is disabled. */
  masks: bigint[];
  /** True when every non-empty token was a valid nonnegative decimal integer. */
  valid: boolean;
  /** Invalid tokens encountered during parsing (order preserved, unique). */
  invalidTokens: string[];
}

export interface GateEventOptions {
  /** Absolute event onset in seconds (post time-warp). */
  time: number;
  /** Requested event duration in seconds. */
  duration: number;
  /** Zero-based track index in the current track list. */
  trackIndex: number;
  /** Song loop duration in seconds (T). */
  loopDuration: number;
  /** Parsed activation masks; empty disables gating. */
  masks: readonly bigint[];
}

export interface GatedEventDuration {
  /** Absolute onset (unchanged from the request when accepted). */
  time: number;
  /** Duration after inactive-boundary clipping. */
  duration: number;
}

const DECIMAL_INTEGER_PATTERN = /^(0|[1-9]\d*)$/;

/**
 * Parses a whitespace-separated sequence of nonnegative decimal integer masks.
 * Blank / whitespace-only input disables the feature (empty masks).
 */
export function parseBitmaskSequenceInput(value: unknown): BitmaskSequenceParseResult {
  if (typeof value !== 'string') {
    return {
      normalizedInput: '',
      masks: [],
      valid: true,
      invalidTokens: [],
    };
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return {
      normalizedInput: '',
      masks: [],
      valid: true,
      invalidTokens: [],
    };
  }

  const tokens = trimmed.split(/\s+/);
  const masks: bigint[] = [];
  const invalidTokens: string[] = [];
  const seenInvalid = new Set<string>();

  for (const token of tokens) {
    if (!DECIMAL_INTEGER_PATTERN.test(token)) {
      if (!seenInvalid.has(token)) {
        seenInvalid.add(token);
        invalidTokens.push(token);
      }
      continue;
    }

    try {
      masks.push(BigInt(token));
    } catch {
      if (!seenInvalid.has(token)) {
        seenInvalid.add(token);
        invalidTokens.push(token);
      }
    }
  }

  // If every token was invalid, treat as disabled so the song is not accidentally silenced.
  if (masks.length === 0) {
    return {
      normalizedInput: '',
      masks: [],
      valid: invalidTokens.length === 0,
      invalidTokens,
    };
  }

  return {
    normalizedInput: masks.map((mask) => mask.toString(10)).join(' '),
    masks,
    valid: invalidTokens.length === 0,
    invalidTokens,
  };
}

/** Normalizes free-form B text for persistence (blank disables). */
export function normalizeBitmaskSequenceInput(value: unknown): string {
  return parseBitmaskSequenceInput(value).normalizedInput;
}

/** True when the given track bit is set in the mask. */
export function isTrackBitActive(mask: bigint, trackIndex: number): boolean {
  if (trackIndex < 0 || !Number.isInteger(trackIndex)) {
    return false;
  }

  return ((mask >> BigInt(trackIndex)) & 1n) === 1n;
}

/**
 * Half-open chunk index for a time inside the song loop:
 * chunk i covers [i * T / N, (i + 1) * T / N).
 * Times at or beyond the loop end map to the last chunk.
 */
export function getActivationChunkIndex(
  timeSeconds: number,
  loopDurationSeconds: number,
  chunkCount: number,
): number {
  if (chunkCount <= 0) {
    return 0;
  }

  if (!(loopDurationSeconds > 0) || !Number.isFinite(timeSeconds)) {
    return 0;
  }

  if (timeSeconds <= 0) {
    return 0;
  }

  if (timeSeconds >= loopDurationSeconds) {
    return chunkCount - 1;
  }

  const raw = Math.floor((timeSeconds * chunkCount) / loopDurationSeconds);
  return Math.max(0, Math.min(chunkCount - 1, raw));
}

/** Absolute start time of chunk i within one loop. */
export function getActivationChunkStart(
  chunkIndex: number,
  loopDurationSeconds: number,
  chunkCount: number,
): number {
  if (chunkCount <= 0 || !(loopDurationSeconds > 0)) {
    return 0;
  }

  return (Math.max(0, chunkIndex) * loopDurationSeconds) / chunkCount;
}

/**
 * Gates a scheduled event by song-level activation masks.
 * Returns null when the onset chunk is inactive for the track.
 * Otherwise returns the onset with a duration clipped at the first later
 * inactive chunk boundary (wrapping once around the song loop).
 */
export function gateEventByActivation(options: GateEventOptions): GatedEventDuration | null {
  const { time, duration, trackIndex, loopDuration, masks } = options;

  if (!(duration > 0) || !Number.isFinite(duration) || !Number.isFinite(time)) {
    return null;
  }

  if (masks.length === 0) {
    return { time, duration };
  }

  if (!(loopDuration > 0)) {
    return { time, duration };
  }

  const chunkCount = masks.length;
  const onsetChunk = getActivationChunkIndex(time, loopDuration, chunkCount);
  if (!isTrackBitActive(masks[onsetChunk], trackIndex)) {
    return null;
  }

  // Walk forward chunk-by-chunk (wrapping once) until the track goes inactive.
  let continuousChunks = 0;
  for (let offset = 0; offset < chunkCount; offset += 1) {
    const chunkIndex = (onsetChunk + offset) % chunkCount;
    if (!isTrackBitActive(masks[chunkIndex], trackIndex)) {
      break;
    }
    continuousChunks += 1;
  }

  if (continuousChunks <= 0) {
    return null;
  }

  // All chunks active for this track: preserve the original duration.
  if (continuousChunks >= chunkCount) {
    return { time, duration };
  }

  // Clip at the end of the last continuous active chunk after the onset chunk.
  // Use the onset chunk start (not the onset time) so a late onset still stops
  // at the shared chunk boundary, including once around the loop.
  const chunkDuration = loopDuration / chunkCount;
  const onsetChunkStart = getActivationChunkStart(onsetChunk, loopDuration, chunkCount);
  const clipBoundary = onsetChunkStart + continuousChunks * chunkDuration;
  const gatedDuration = Math.max(0, Math.min(duration, clipBoundary - time));
  if (!(gatedDuration > 0)) {
    return null;
  }

  return {
    time,
    duration: gatedDuration,
  };
}

/**
 * Builds per-chunk active/inactive flags for a track across the song loop.
 * Empty masks mean the feature is disabled (no overlay needed).
 */
export function buildTrackChunkActivationStates(
  masks: readonly bigint[],
  trackIndex: number,
): boolean[] {
  return masks.map((mask) => isTrackBitActive(mask, trackIndex));
}
