export const DRUM_VOICE_IDS = [
  'kick',
  'rimshot',
  'snare',
  'clap',
  'tomLowFloor',
  'hat',
  'tomHighFloor',
  'hatPedal',
  'tom',
  'hatOpen',
  'tomLowMid',
  'tomHighMid',
  'crash',
  'tomHigh',
  'chineseCymbal',
  'ride',
  'rideBell',
  'splash',
  'cowbell',
  'crash2',
  'ride2',
  'congaMuted',
  'congaOpen',
  'conga',
  'timbale',
  'timbaleLow',
  'triangleMuted',
  'triangle',
  'shaker',
  'chimes',
] as const;

export type DrumVoiceId = typeof DRUM_VOICE_IDS[number];
export type DrumParameterValue = number | string;
export type DrumParameterBag = Record<string, DrumParameterValue>;

export interface DrumParameterDefinition {
  name: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  kind?: 'number' | 'select';
  options?: readonly string[];
}

export interface DrumLane {
  voiceId: DrumVoiceId;
  parameters: DrumParameterBag;
}

export interface RhythmHit {
  laneIndex: number;
  voiceId: DrumVoiceId;
  midi: number;
  velocity: number;
}

export interface ParsedRhythmSequence {
  masks: bigint[];
  invalidTokens: string[];
  normalizedInput: string;
  valid: boolean;
}

const DRUM_VOICE_LABELS: Record<DrumVoiceId, string> = {
  kick: 'Kick',
  rimshot: 'Rimshot / Side Stick',
  snare: 'Snare',
  clap: 'Clap',
  tomLowFloor: 'Low Floor Tom',
  hat: 'Closed Hi-Hat',
  tomHighFloor: 'High Floor Tom',
  hatPedal: 'Pedal Hi-Hat',
  tom: 'Low Tom',
  hatOpen: 'Open Hi-Hat',
  tomLowMid: 'Low-Mid Tom',
  tomHighMid: 'High-Mid Tom',
  crash: 'Crash Cymbal 1',
  tomHigh: 'High Tom',
  chineseCymbal: 'Chinese Cymbal',
  ride: 'Ride Cymbal 1',
  rideBell: 'Ride Bell',
  splash: 'Splash Cymbal',
  cowbell: 'Cowbell',
  crash2: 'Crash Cymbal 2',
  ride2: 'Ride Cymbal 2',
  congaMuted: 'Mute High Conga',
  congaOpen: 'Open High Conga',
  conga: 'Low Conga',
  timbale: 'High Timbale',
  timbaleLow: 'Low Timbale',
  triangleMuted: 'Mute Triangle',
  triangle: 'Open Triangle',
  shaker: 'Shaker',
  chimes: 'Bell Tree / Chimes',
};

const DRUM_MIDI_NOTES: Record<DrumVoiceId, number> = {
  kick: 36,
  rimshot: 37,
  snare: 38,
  clap: 39,
  tomLowFloor: 41,
  hat: 42,
  tomHighFloor: 43,
  hatPedal: 44,
  hatOpen: 46,
  tomLowMid: 47,
  tomHighMid: 48,
  crash: 49,
  tomHigh: 50,
  ride: 51,
  chineseCymbal: 52,
  rideBell: 53,
  splash: 55,
  cowbell: 56,
  crash2: 57,
  ride2: 59,
  congaMuted: 62,
  congaOpen: 63,
  tom: 45,
  conga: 64,
  timbale: 65,
  timbaleLow: 66,
  triangleMuted: 80,
  triangle: 81,
  shaker: 82,
  chimes: 84,
};

const SHARED_DEFAULT_PARAMETERS: DrumParameterBag = {
  filterType: 'lowpass',
  filterFrequency: 20000,
  filterResonance: 1,
  filterRolloff: -12,
  filterGain: 0,
  velToFilter: 0,
  filterEnvTime: 0.15,
  distortionInputGain: 0,
};

const VOICE_DEFAULT_PARAMETERS: Record<DrumVoiceId, DrumParameterBag> = {
  kick: { tune: 55, sweep: 4, sweepTime: 0.05, pitchShape: 3, decay: 0.45, ampShape: 2, drive: 0.35, wavePower: 2.5 },
  rimshot: { tune: 260, decay: 0.09, sweep: 0.2, sweepTime: 0.008, snap: 0.9, color: 4800 },
  snare: { tune: 185, toneDecay: 0.12, noiseType: 'white', noiseDecay: 0.2, snap: 0.7, mix: 0.5 },
  clap: { tune: 1600, toneDecay: 0.03, noiseType: 'pink', noiseDecay: 0.24, snap: 0.85, mix: 0.55 },
  tomLowFloor: { tune: 73, decay: 0.52, sweep: 1.55, sweepTime: 0.052, snap: 0.05, color: 1500 },
  hat: { tune: 300, decay: 0.08, brightness: 8000, harmonicity: 5.1, modIndex: 32 },
  tomHighFloor: { tune: 87, decay: 0.45, sweep: 1.48, sweepTime: 0.046, snap: 0.06, color: 1800 },
  hatPedal: { tune: 285, decay: 0.055, brightness: 7200, harmonicity: 5.4, modIndex: 28 },
  tom: { tune: 110, decay: 0.34, sweep: 1.3, sweepTime: 0.035, snap: 0.08, color: 2300 },
  hatOpen: { tune: 275, decay: 0.48, brightness: 9200, harmonicity: 4.9, modIndex: 38 },
  tomLowMid: { tune: 131, decay: 0.3, sweep: 1.18, sweepTime: 0.03, snap: 0.09, color: 2700 },
  tomHighMid: { tune: 147, decay: 0.27, sweep: 1.08, sweepTime: 0.026, snap: 0.1, color: 3100 },
  crash: { tune: 220, decay: 1.4, brightness: 12000, harmonicity: 2.2, modIndex: 55, wash: 0.65 },
  tomHigh: { tune: 165, decay: 0.24, sweep: 0.96, sweepTime: 0.022, snap: 0.12, color: 3500 },
  chineseCymbal: { tune: 175, decay: 1.75, brightness: 8800, harmonicity: 1.45, modIndex: 72, wash: 0.52 },
  ride: { tune: 320, decay: 1.8, brightness: 11000, harmonicity: 2.8, modIndex: 42, wash: 0.38 },
  rideBell: { tune: 720, decay: 0.72, brightness: 13800, harmonicity: 4.2, modIndex: 34, wash: 0.12 },
  splash: { tune: 410, decay: 0.62, brightness: 14500, harmonicity: 3.1, modIndex: 48, wash: 0.58 },
  cowbell: { tune: 560, decay: 0.22, brightness: 7000, harmonicity: 5.1, modIndex: 18 },
  crash2: { tune: 245, decay: 1.7, brightness: 13200, harmonicity: 2.55, modIndex: 62, wash: 0.7 },
  ride2: { tune: 350, decay: 2.15, brightness: 10200, harmonicity: 2.35, modIndex: 49, wash: 0.46 },
  congaMuted: { tune: 262, decay: 0.105, sweep: 0.18, sweepTime: 0.01, snap: 0.72, color: 4600 },
  congaOpen: { tune: 233, decay: 0.31, sweep: 0.28, sweepTime: 0.016, snap: 0.24, color: 3700 },
  conga: { tune: 196, decay: 0.26, sweep: 0.35, sweepTime: 0.018, snap: 0.16, color: 3200 },
  timbale: { tune: 260, decay: 0.22, sweep: 0.15, sweepTime: 0.01, snap: 0.3, color: 4400 },
  timbaleLow: { tune: 196, decay: 0.28, sweep: 0.19, sweepTime: 0.014, snap: 0.26, color: 3600 },
  triangleMuted: { tune: 990, decay: 0.14, brightness: 9800, harmonicity: 3.8, modIndex: 8 },
  triangle: { tune: 880, decay: 1.1, brightness: 10500, harmonicity: 3.8, modIndex: 8 },
  shaker: { tune: 4200, decay: 0.12, snap: 0.85, color: 7500 },
  chimes: { tune: 1047, decay: 2.6, brightness: 9000, harmonicity: 2.1, modIndex: 10 },
};

const PARAMETER_DEFINITIONS: Record<string, DrumParameterDefinition> = {
  filterType: { name: 'filterType', label: 'Filter', kind: 'select', options: ['lowpass', 'highpass', 'bandpass'] },
  filterFrequency: { name: 'filterFrequency', label: 'Filter Freq', min: 20, max: 20000, step: 1 },
  filterResonance: { name: 'filterResonance', label: 'Filter Reso', min: 0.1, max: 20, step: 0.1 },
  filterRolloff: { name: 'filterRolloff', label: 'Filter Slope', min: -96, max: -12, step: 12 },
  filterGain: { name: 'filterGain', label: 'Filter Gain', min: -24, max: 24, step: 0.5 },
  velToFilter: { name: 'velToFilter', label: 'Velocity Filter', min: -1, max: 1, step: 0.01 },
  filterEnvTime: { name: 'filterEnvTime', label: 'Filter Env', min: 0, max: 2, step: 0.01 },
  distortionInputGain: { name: 'distortionInputGain', label: 'Drive Input', min: -60, max: 60, step: 0.5 },
  tune: { name: 'tune', label: 'Tune', min: 20, max: 20000, step: 1 },
  sweep: { name: 'sweep', label: 'Pitch Sweep', min: 0, max: 8, step: 0.01 },
  sweepTime: { name: 'sweepTime', label: 'Sweep Time', min: 0.001, max: 1, step: 0.001 },
  pitchShape: { name: 'pitchShape', label: 'Pitch Shape', min: 0.05, max: 12, step: 0.05 },
  decay: { name: 'decay', label: 'Decay', min: 0.01, max: 4, step: 0.001 },
  ampShape: { name: 'ampShape', label: 'Amp Shape', min: 0.05, max: 12, step: 0.05 },
  drive: { name: 'drive', label: 'Drive', min: 0, max: 1, step: 0.01 },
  wavePower: { name: 'wavePower', label: 'Wave Power', min: 0.15, max: 16, step: 0.05 },
  toneDecay: { name: 'toneDecay', label: 'Tone Decay', min: 0.001, max: 2, step: 0.001 },
  noiseType: { name: 'noiseType', label: 'Noise', kind: 'select', options: ['white', 'pink', 'brown'] },
  noiseDecay: { name: 'noiseDecay', label: 'Noise Decay', min: 0.001, max: 4, step: 0.001 },
  snap: { name: 'snap', label: 'Snap', min: 0, max: 1, step: 0.01 },
  mix: { name: 'mix', label: 'Tone Mix', min: 0, max: 1, step: 0.01 },
  brightness: { name: 'brightness', label: 'Brightness', min: 100, max: 20000, step: 1 },
  harmonicity: { name: 'harmonicity', label: 'Harmonicity', min: 0.1, max: 10, step: 0.01 },
  modIndex: { name: 'modIndex', label: 'FM Index', min: 0, max: 100, step: 0.1 },
  wash: { name: 'wash', label: 'Noise Wash', min: 0, max: 1, step: 0.01 },
  color: { name: 'color', label: 'Noise Color', min: 100, max: 20000, step: 1 },
};

const DRUM_VOICE_ICONS: Record<DrumVoiceId, string> = {
  kick: 'mdi-circle-slice-8',
  rimshot: 'mdi-circle-slice-6',
  snare: 'mdi-grain',
  clap: 'mdi-hand-clap',
  tomLowFloor: 'mdi-circle-outline',
  tomHighFloor: 'mdi-circle-outline',
  tom: 'mdi-circle-outline',
  tomLowMid: 'mdi-circle-outline',
  tomHighMid: 'mdi-circle-outline',
  tomHigh: 'mdi-circle-outline',
  hat: 'mdi-circle-double',
  hatPedal: 'mdi-circle-double',
  hatOpen: 'mdi-circle-multiple-outline',
  crash: 'mdi-record-circle-outline',
  crash2: 'mdi-record-circle-outline',
  splash: 'mdi-record-circle-outline',
  chineseCymbal: 'mdi-record-circle-outline',
  ride: 'mdi-circle-half-full',
  ride2: 'mdi-circle-half-full',
  rideBell: 'mdi-bell-ring-outline',
  cowbell: 'mdi-bell-outline',
  congaMuted: 'mdi-circle-slice-4',
  congaOpen: 'mdi-circle-slice-4',
  conga: 'mdi-circle-slice-4',
  timbale: 'mdi-circle-slice-4',
  timbaleLow: 'mdi-circle-slice-4',
  triangleMuted: 'mdi-triangle-outline',
  triangle: 'mdi-triangle-outline',
  shaker: 'mdi-shaker-outline',
  chimes: 'mdi-music-note',
};

export function drumVoiceIcon(voiceId: DrumVoiceId): string {
  return DRUM_VOICE_ICONS[voiceId] ?? 'mdi-circle-outline';
}

export const DRUM_VOICE_OPTIONS: readonly { title: string; value: DrumVoiceId; midi: number; icon: string }[] = DRUM_VOICE_IDS.map((voiceId) => ({
  title: DRUM_VOICE_LABELS[voiceId],
  value: voiceId,
  midi: DRUM_MIDI_NOTES[voiceId],
  icon: DRUM_VOICE_ICONS[voiceId],
}));

export const DEFAULT_RHYTHM_VOICE_IDS: readonly DrumVoiceId[] = ['kick', 'snare', 'hat', 'hatOpen', 'crash'];

export function isDrumVoiceId(value: unknown): value is DrumVoiceId {
  return typeof value === 'string' && (DRUM_VOICE_IDS as readonly string[]).includes(value);
}

export function drumVoiceLabel(voiceId: DrumVoiceId): string {
  return DRUM_VOICE_LABELS[voiceId];
}

export function drumVoiceMidiNote(voiceId: DrumVoiceId): number {
  return DRUM_MIDI_NOTES[voiceId];
}

export function getDefaultDrumParameters(voiceId: DrumVoiceId): DrumParameterBag {
  return { ...SHARED_DEFAULT_PARAMETERS, ...VOICE_DEFAULT_PARAMETERS[voiceId] };
}

export function getDrumParameterDefinitions(voiceId: DrumVoiceId): readonly DrumParameterDefinition[] {
  return Object.keys(getDefaultDrumParameters(voiceId))
    .map((name) => {
      const definition = PARAMETER_DEFINITIONS[name];
      if (definition?.name === 'tune' && voiceId === 'kick') {
        return { ...definition, max: 400 };
      }
      if (definition?.name === 'tune' && voiceId === 'snare') {
        return { ...definition, min: 80, max: 400 };
      }
      return definition;
    })
    .filter((definition): definition is DrumParameterDefinition => definition !== undefined);
}

export function createDefaultDrumLane(voiceId: DrumVoiceId): DrumLane {
  return {
    voiceId,
    parameters: getDefaultDrumParameters(voiceId),
  };
}

export function createDefaultRhythmLanes(): DrumLane[] {
  return DEFAULT_RHYTHM_VOICE_IDS.map(createDefaultDrumLane);
}

export function normalizeDrumVelocityBits(value: unknown, fallback = 1): number {
  const candidate = typeof value === 'number' && Number.isFinite(value) ? Math.trunc(value) : fallback;
  return Math.min(7, Math.max(1, candidate));
}

export function normalizeDrumParameters(voiceId: DrumVoiceId, value: unknown): DrumParameterBag {
  const defaults = getDefaultDrumParameters(voiceId);
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const normalized: DrumParameterBag = { ...defaults };

  for (const [name, defaultValue] of Object.entries(defaults)) {
    const candidate = raw[name];
    if (typeof defaultValue === 'number') {
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        const definition = getDrumParameterDefinitions(voiceId).find((entry) => entry.name === name);
        const maximum = definition?.max;
        normalized[name] = definition?.min !== undefined && maximum !== undefined
          ? Math.min(maximum, Math.max(definition.min, candidate))
          : candidate;
      }
    } else if (typeof candidate === 'string') {
      const definition = PARAMETER_DEFINITIONS[name];
      normalized[name] = definition?.options?.includes(candidate) === false ? defaultValue : candidate;
    }
  }

  return normalized;
}

export function normalizeDrumLanes(value: unknown): DrumLane[] {
  const rawLanes = Array.isArray(value) ? value : [];
  const lanes: DrumLane[] = [];
  const usedVoices = new Set<DrumVoiceId>();

  for (const rawLane of rawLanes) {
    if (!rawLane || typeof rawLane !== 'object') {
      continue;
    }
    const candidate = rawLane as { voiceId?: unknown; parameters?: unknown };
    if (!isDrumVoiceId(candidate.voiceId) || usedVoices.has(candidate.voiceId)) {
      continue;
    }
    usedVoices.add(candidate.voiceId);
    lanes.push({
      voiceId: candidate.voiceId,
      parameters: normalizeDrumParameters(candidate.voiceId, candidate.parameters),
    });
  }

  return lanes.length > 0 ? lanes : createDefaultRhythmLanes();
}

export function cloneDrumLanes(lanes: readonly DrumLane[]): DrumLane[] {
  return lanes.map((lane) => ({
    voiceId: lane.voiceId,
    parameters: { ...lane.parameters },
  }));
}

export function parseRhythmSequenceInput(sequenceInput: string): ParsedRhythmSequence {
  const tokens = sequenceInput.trim() === '' ? [] : sequenceInput.trim().split(/\s+/);
  const masks: bigint[] = [];
  const invalidTokens: string[] = [];

  for (const token of tokens) {
    if (!/^(?:0|[1-9]\d*)$/.test(token)) {
      invalidTokens.push(token);
      continue;
    }
    masks.push(BigInt(token));
  }

  return {
    masks,
    invalidTokens,
    normalizedInput: masks.map((mask) => mask.toString(10)).join(' '),
    valid: invalidTokens.length === 0,
  };
}

export function decodeRhythmMasks(
  masks: readonly bigint[],
  lanes: readonly DrumLane[],
  velocityBits: number,
): RhythmHit[][] {
  const bits = normalizeDrumVelocityBits(velocityBits);
  const maxValue = (1n << BigInt(bits)) - 1n;

  return masks.map((mask) => {
    const hits: RhythmHit[] = [];
    lanes.forEach((lane, laneIndex) => {
      const value = (mask >> BigInt(laneIndex * bits)) & maxValue;
      if (value === 0n) {
        return;
      }
      hits.push({
        laneIndex,
        voiceId: lane.voiceId,
        midi: drumVoiceMidiNote(lane.voiceId),
        velocity: Number(value) / Number(maxValue),
      });
    });
    return hits;
  });
}

export function decodeRhythmSequence(
  sequenceInput: string,
  lanes: readonly DrumLane[],
  velocityBits: number,
): RhythmHit[][] {
  return decodeRhythmMasks(parseRhythmSequenceInput(sequenceInput).masks, lanes, velocityBits);
}
