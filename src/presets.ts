export interface PresetTrackData {
  id: string;
  name: string;
  numerator: number;
  denominator: number;
  waveform: string;
  sequenceInput: string;
  octave: number;
  lengthFactor: number;
  midiChannel: number;
  gain: number;
  velocityMultiplier: number;
  delay: number;
  repeats: number;
  attack: number;
  release: number;
  unisonVoices: number;
  unisonDetune: number;
  tremoloEnabled: boolean;
  tremoloFrequency: number;
  tremoloDepth: number;
  tremoloSpread: number;
  vibratoEnabled: boolean;
  vibratoFrequency: number;
  vibratoDepth: number;
  filterEnabled: boolean;
  filterType: string;
  filterFrequency: number;
  filterRolloff: number;
  filterQ: number;
  filterGain: number;
  filterKeyFollow: number;
  limiterGain: number;
  echoEnabled: boolean;
  echoDelay: EchoDelayValue;
  echoFeedback: number;
  echoWet: number;
  echoPingPong: boolean;
  reverbWet: number;
}

export type EchoDelayValue = typeof ECHO_DELAY_OPTIONS[number];

export const ECHO_DELAY_OPTIONS = [
  '1/1',
  '1/1D',
  '1/1T',
  '1/2',
  '1/2D',
  '1/2T',
  '1/4',
  '1/4D',
  '1/4T',
  '1/8',
  '1/8D',
  '1/8T',
  '1/16',
  '1/16D',
  '1/16T',
] as const;

export interface PresetReverbData {
  enabled: boolean;
  decay: number;
  preDelay: number;
  dry: number;
  wet: number;
  lowCut: number;
  highCut: number;
}

export interface PresetData {
  bpm: number;
  forte: string;
  tracks: PresetTrackData[];
  reverb: PresetReverbData;
}

export interface NamedPreset {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: PresetData;
}

export interface PresetLibrary {
  version: 1;
  migratedLegacy: boolean;
  selectedPresetId: string | null;
  presets: NamedPreset[];
}

export interface SinglePresetExport {
  version: 1;
  kind: 'single-preset';
  exportedAt: string;
  preset: NamedPreset;
}

export interface PresetLibraryExport {
  version: 1;
  kind: 'preset-library';
  exportedAt: string;
  selectedPresetId: string | null;
  presets: NamedPreset[];
}

export type PresetImportPayload = SinglePresetExport | PresetLibraryExport;

export interface MergeImportedPresetsResult {
  presets: NamedPreset[];
  importedPresets: NamedPreset[];
  selectedPresetId: string | null;
}

export const DEFAULT_PRESET_TRACK_DATA: PresetTrackData = {
  id: 'track-1',
  name: 'Track 1',
  numerator: 4,
  denominator: 5,
  waveform: 'sine',
  sequenceInput: '1 2 4 8 16',
  octave: 6,
  lengthFactor: 100,
  midiChannel: 1,
  gain: 0,
  velocityMultiplier: 1,
  delay: 0,
  repeats: 1,
  attack: 0.01,
  release: 0.12,
  unisonVoices: 1,
  unisonDetune: 12,
  tremoloEnabled: false,
  tremoloFrequency: 5,
  tremoloDepth: 0.35,
  tremoloSpread: 180,
  vibratoEnabled: false,
  vibratoFrequency: 5,
  vibratoDepth: 0.08,
  filterEnabled: false,
  filterType: 'lowpass',
  filterFrequency: 119,
  filterRolloff: -24,
  filterQ: 1,
  filterGain: 0,
  filterKeyFollow: 0,
  limiterGain: 0,
  echoEnabled: false,
  echoDelay: '1/4',
  echoFeedback: 0.25,
  echoWet: -12,
  echoPingPong: true,
  reverbWet: -14,
};

export const DEFAULT_PRESET_DATA: PresetData = {
  bpm: 90,
  forte: '5-35.05',
  tracks: [DEFAULT_PRESET_TRACK_DATA],
  reverb: {
  enabled: true,
  decay: 8,
  preDelay: 0.04,
  dry: 0,
  wet: -2,
  lowCut: 39,
  highCut: 112,
  },
};

const STORAGE_KEY = 'ss3k_preset_library_v1';
const LEGACY_KEYS = {
  bpm: 'ss3k_bpm',
  numerator: 'ss3k_numerator',
  denominator: 'ss3k_denominator',
  waveform: 'ss3k_waveform',
  sequenceInput: 'ss3k_sequence',
  octave: 'ss3k_octave',
  lengthFactor: 'ss3k_lengthFactor',
  forte: 'ss3k_forte',
} as const;

const WAVEFORMS = new Set(['sine', 'square', 'triangle', 'sawtooth']);
const FILTER_TYPES = new Set(['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking']);
const FILTER_ROLLOFFS = new Set([-12, -24, -48, -96]);
const ECHO_DELAY_VALUES = new Set<string>(ECHO_DELAY_OPTIONS);

type LegacyTrackFields = {
  numerator?: number;
  denominator?: number;
  waveform?: string;
  sequenceInput?: string;
  octave?: number;
  lengthFactor?: number;
  midiChannel?: number;
  gain?: number;
  delay?: number;
  repeats?: number;
};

function isoNow(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createTrackId(index: number): string {
  return `track-${index + 1}-${Math.random().toString(16).slice(2, 8)}`;
}

function parseInteger(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeWaveform(value: unknown): PresetTrackData['waveform'] {
  return typeof value === 'string' && WAVEFORMS.has(value) ? value : DEFAULT_PRESET_TRACK_DATA.waveform;
}

function normalizeFilterType(value: unknown): PresetTrackData['filterType'] {
  return typeof value === 'string' && FILTER_TYPES.has(value) ? value : DEFAULT_PRESET_TRACK_DATA.filterType;
}

function normalizeFilterRolloff(value: unknown): PresetTrackData['filterRolloff'] {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return FILTER_ROLLOFFS.has(parsed) ? parsed : DEFAULT_PRESET_TRACK_DATA.filterRolloff;
}

function normalizeEchoDelay(value: unknown): EchoDelayValue {
  return typeof value === 'string' && ECHO_DELAY_VALUES.has(value) ? value as EchoDelayValue : DEFAULT_PRESET_TRACK_DATA.echoDelay;
}

export function clonePresetReverbData(reverb: PresetReverbData): PresetReverbData {
  return {
    enabled: reverb.enabled,
    decay: reverb.decay,
    preDelay: reverb.preDelay,
    dry: reverb.dry,
    wet: reverb.wet,
    lowCut: reverb.lowCut,
    highCut: reverb.highCut,
  };
}

export function normalizePresetReverbData(value: unknown): PresetReverbData {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<PresetReverbData>;
  return {
    enabled: raw.enabled ?? DEFAULT_PRESET_DATA.reverb.enabled,
    decay: clamp(parseNumber(raw.decay, DEFAULT_PRESET_DATA.reverb.decay), 0.1, 30),
    preDelay: clamp(parseNumber(raw.preDelay, DEFAULT_PRESET_DATA.reverb.preDelay), 0, 1),
    dry: clamp(parseNumber(raw.dry, DEFAULT_PRESET_DATA.reverb.dry), -96, 12),
    wet: clamp(parseNumber(raw.wet, DEFAULT_PRESET_DATA.reverb.wet), -96, 12),
    lowCut: clamp(parseNumber(raw.lowCut, DEFAULT_PRESET_DATA.reverb.lowCut), 0, 127),
    highCut: clamp(parseNumber(raw.highCut, DEFAULT_PRESET_DATA.reverb.highCut), 0, 127),
  };
}

export function sanitizeTrackName(name: string | null | undefined, fallbackIndex = 0): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : `Track ${fallbackIndex + 1}`;
}

export function clonePresetTrackData(track: PresetTrackData): PresetTrackData {
  return {
    id: track.id,
    name: track.name,
    numerator: track.numerator,
    denominator: track.denominator,
    waveform: track.waveform,
    sequenceInput: track.sequenceInput,
    octave: track.octave,
    lengthFactor: track.lengthFactor,
    midiChannel: track.midiChannel,
    gain: track.gain,
    velocityMultiplier: track.velocityMultiplier,
    delay: track.delay,
    repeats: track.repeats,
    attack: track.attack,
    release: track.release,
    unisonVoices: track.unisonVoices,
    unisonDetune: track.unisonDetune,
    tremoloEnabled: track.tremoloEnabled,
    tremoloFrequency: track.tremoloFrequency,
    tremoloDepth: track.tremoloDepth,
    tremoloSpread: track.tremoloSpread,
    vibratoEnabled: track.vibratoEnabled,
    vibratoFrequency: track.vibratoFrequency,
    vibratoDepth: track.vibratoDepth,
    filterEnabled: track.filterEnabled,
    filterType: track.filterType,
    filterFrequency: track.filterFrequency,
    filterRolloff: track.filterRolloff,
    filterQ: track.filterQ,
    filterGain: track.filterGain,
    filterKeyFollow: track.filterKeyFollow,
    limiterGain: track.limiterGain,
    echoEnabled: track.echoEnabled,
    echoDelay: track.echoDelay,
    echoFeedback: track.echoFeedback,
    echoWet: track.echoWet,
    echoPingPong: track.echoPingPong,
    reverbWet: track.reverbWet,
  };
}

export function normalizePresetTrackData(value: unknown, index = 0): PresetTrackData {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<PresetTrackData>;

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : createTrackId(index),
    name: sanitizeTrackName(raw.name, index),
    numerator: clamp(parseInteger(raw.numerator?.toString(), DEFAULT_PRESET_TRACK_DATA.numerator), 1, 16),
    denominator: clamp(parseInteger(raw.denominator?.toString(), DEFAULT_PRESET_TRACK_DATA.denominator), 1, 16),
    waveform: normalizeWaveform(raw.waveform),
    sequenceInput: typeof raw.sequenceInput === 'string' ? raw.sequenceInput : DEFAULT_PRESET_TRACK_DATA.sequenceInput,
    octave: clamp(parseInteger(raw.octave?.toString(), DEFAULT_PRESET_TRACK_DATA.octave), 0, 10),
    lengthFactor: clamp(parseInteger(raw.lengthFactor?.toString(), DEFAULT_PRESET_TRACK_DATA.lengthFactor), 1, 400),
    midiChannel: clamp(parseInteger(raw.midiChannel?.toString(), DEFAULT_PRESET_TRACK_DATA.midiChannel), 1, 16),
    gain: clamp(parseNumber(raw.gain, DEFAULT_PRESET_TRACK_DATA.gain), -96, 24),
    velocityMultiplier: clamp(parseNumber(raw.velocityMultiplier, DEFAULT_PRESET_TRACK_DATA.velocityMultiplier), 0, 4),
    delay: clamp(parseInteger(raw.delay?.toString(), DEFAULT_PRESET_TRACK_DATA.delay), 0, 64),
    repeats: clamp(parseInteger(raw.repeats?.toString(), DEFAULT_PRESET_TRACK_DATA.repeats), 1, 64),
    attack: clamp(parseNumber(raw.attack, DEFAULT_PRESET_TRACK_DATA.attack), 0, 10),
    release: clamp(parseNumber(raw.release, DEFAULT_PRESET_TRACK_DATA.release), 0, 20),
    unisonVoices: clamp(parseInteger(raw.unisonVoices?.toString(), DEFAULT_PRESET_TRACK_DATA.unisonVoices), 1, 8),
    unisonDetune: clamp(parseNumber(raw.unisonDetune, DEFAULT_PRESET_TRACK_DATA.unisonDetune), 0, 100),
    tremoloEnabled: Boolean(raw.tremoloEnabled ?? DEFAULT_PRESET_TRACK_DATA.tremoloEnabled),
    tremoloFrequency: clamp(parseNumber(raw.tremoloFrequency, DEFAULT_PRESET_TRACK_DATA.tremoloFrequency), 0.01, 40),
    tremoloDepth: clamp(parseNumber(raw.tremoloDepth, DEFAULT_PRESET_TRACK_DATA.tremoloDepth), 0, 1),
    tremoloSpread: clamp(parseNumber(raw.tremoloSpread, DEFAULT_PRESET_TRACK_DATA.tremoloSpread), 0, 360),
    vibratoEnabled: Boolean(raw.vibratoEnabled ?? DEFAULT_PRESET_TRACK_DATA.vibratoEnabled),
    vibratoFrequency: clamp(parseNumber(raw.vibratoFrequency, DEFAULT_PRESET_TRACK_DATA.vibratoFrequency), 0.01, 40),
    vibratoDepth: clamp(parseNumber(raw.vibratoDepth, DEFAULT_PRESET_TRACK_DATA.vibratoDepth), 0, 1),
    filterEnabled: Boolean(raw.filterEnabled ?? DEFAULT_PRESET_TRACK_DATA.filterEnabled),
    filterType: normalizeFilterType(raw.filterType),
    filterFrequency: clamp(parseNumber(raw.filterFrequency, DEFAULT_PRESET_TRACK_DATA.filterFrequency), 0, 127),
    filterRolloff: normalizeFilterRolloff(raw.filterRolloff),
    filterQ: clamp(parseNumber(raw.filterQ, DEFAULT_PRESET_TRACK_DATA.filterQ), 0.0001, 30),
    filterGain: clamp(parseNumber(raw.filterGain, DEFAULT_PRESET_TRACK_DATA.filterGain), -48, 48),
    filterKeyFollow: clamp(parseNumber(raw.filterKeyFollow, DEFAULT_PRESET_TRACK_DATA.filterKeyFollow), -200, 200),
    limiterGain: clamp(parseNumber(raw.limiterGain, DEFAULT_PRESET_TRACK_DATA.limiterGain), -48, 72),
    echoEnabled: Boolean(raw.echoEnabled ?? DEFAULT_PRESET_TRACK_DATA.echoEnabled),
    echoDelay: normalizeEchoDelay(raw.echoDelay),
    echoFeedback: clamp(parseNumber(raw.echoFeedback, DEFAULT_PRESET_TRACK_DATA.echoFeedback), 0, 0.95),
    echoWet: clamp(parseNumber(raw.echoWet, DEFAULT_PRESET_TRACK_DATA.echoWet), -96, 0),
    echoPingPong: Boolean(raw.echoPingPong ?? DEFAULT_PRESET_TRACK_DATA.echoPingPong),
    reverbWet: clamp(parseNumber(raw.reverbWet, DEFAULT_PRESET_TRACK_DATA.reverbWet), -96, 0),
  };
}

function normalizeLegacyTrack(value: LegacyTrackFields): PresetTrackData {
  return normalizePresetTrackData({
    id: 'track-1',
    name: 'Track 1',
    numerator: value.numerator,
    denominator: value.denominator,
    waveform: value.waveform,
    sequenceInput: value.sequenceInput,
    octave: value.octave,
    lengthFactor: value.lengthFactor,
    midiChannel: value.midiChannel,
    gain: value.gain,
    delay: value.delay,
    repeats: value.repeats,
  }, 0);
}

export function clonePresetData(data: PresetData): PresetData {
  return {
    bpm: data.bpm,
    forte: data.forte,
    tracks: data.tracks.map((track) => clonePresetTrackData(track)),
    reverb: clonePresetReverbData(data.reverb),
  };
}

export function normalizePresetData(value: unknown): PresetData {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<PresetData> & {
    numerator?: number;
    denominator?: number;
    waveform?: string;
    sequenceInput?: string;
    octave?: number;
    lengthFactor?: number;
    midiChannel?: number;
    gain?: number;
  };

  const tracks = Array.isArray(raw.tracks)
    ? raw.tracks.map((track, index) => normalizePresetTrackData(track, index))
    : [];

  return {
    bpm: clamp(parseInteger(raw.bpm?.toString(), DEFAULT_PRESET_DATA.bpm), 1, 499),
    forte: typeof raw.forte === 'string' && raw.forte.trim().length > 0 ? raw.forte : DEFAULT_PRESET_DATA.forte,
    tracks: tracks.length > 0 ? tracks : [normalizeLegacyTrack(raw)],
    reverb: normalizePresetReverbData(raw.reverb),
  };
}

export function arePresetDataEqual(left: PresetData, right: PresetData): boolean {
  if (left.bpm !== right.bpm
    || left.forte !== right.forte
    || left.tracks.length !== right.tracks.length
    || left.reverb.enabled !== right.reverb.enabled
    || left.reverb.decay !== right.reverb.decay
    || left.reverb.preDelay !== right.reverb.preDelay
    || left.reverb.dry !== right.reverb.dry
    || left.reverb.wet !== right.reverb.wet
    || left.reverb.lowCut !== right.reverb.lowCut
    || left.reverb.highCut !== right.reverb.highCut) {
    return false;
  }

  for (let index = 0; index < left.tracks.length; index += 1) {
    const leftTrack = left.tracks[index];
    const rightTrack = right.tracks[index];
    if (leftTrack.id !== rightTrack.id
      || leftTrack.name !== rightTrack.name
      || leftTrack.numerator !== rightTrack.numerator
      || leftTrack.denominator !== rightTrack.denominator
      || leftTrack.waveform !== rightTrack.waveform
      || leftTrack.sequenceInput !== rightTrack.sequenceInput
      || leftTrack.octave !== rightTrack.octave
      || leftTrack.lengthFactor !== rightTrack.lengthFactor
      || leftTrack.midiChannel !== rightTrack.midiChannel
      || leftTrack.gain !== rightTrack.gain
      || leftTrack.velocityMultiplier !== rightTrack.velocityMultiplier
      || leftTrack.delay !== rightTrack.delay
      || leftTrack.repeats !== rightTrack.repeats
      || leftTrack.attack !== rightTrack.attack
      || leftTrack.release !== rightTrack.release
      || leftTrack.unisonVoices !== rightTrack.unisonVoices
      || leftTrack.unisonDetune !== rightTrack.unisonDetune
      || leftTrack.tremoloEnabled !== rightTrack.tremoloEnabled
      || leftTrack.tremoloFrequency !== rightTrack.tremoloFrequency
      || leftTrack.tremoloDepth !== rightTrack.tremoloDepth
      || leftTrack.tremoloSpread !== rightTrack.tremoloSpread
      || leftTrack.vibratoEnabled !== rightTrack.vibratoEnabled
      || leftTrack.vibratoFrequency !== rightTrack.vibratoFrequency
      || leftTrack.vibratoDepth !== rightTrack.vibratoDepth
      || leftTrack.filterEnabled !== rightTrack.filterEnabled
      || leftTrack.filterType !== rightTrack.filterType
      || leftTrack.filterFrequency !== rightTrack.filterFrequency
      || leftTrack.filterRolloff !== rightTrack.filterRolloff
      || leftTrack.filterQ !== rightTrack.filterQ
      || leftTrack.filterGain !== rightTrack.filterGain
      || leftTrack.filterKeyFollow !== rightTrack.filterKeyFollow
      || leftTrack.limiterGain !== rightTrack.limiterGain
      || leftTrack.echoEnabled !== rightTrack.echoEnabled
      || leftTrack.echoDelay !== rightTrack.echoDelay
      || leftTrack.echoFeedback !== rightTrack.echoFeedback
      || leftTrack.echoWet !== rightTrack.echoWet
      || leftTrack.echoPingPong !== rightTrack.echoPingPong
      || leftTrack.reverbWet !== rightTrack.reverbWet) {
      return false;
    }
  }

  return true;
}

export function createNamedPreset(name: string, data: PresetData, createdAt = isoNow()): NamedPreset {
  const normalizedData = normalizePresetData(data);

  return {
    id: createId(),
    name: sanitizePresetName(name),
    createdAt,
    updatedAt: createdAt,
    data: normalizedData,
  };
}

export function sanitizePresetName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Untitled preset';
}

function normalizeNamedPreset(value: unknown, index: number): NamedPreset {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<NamedPreset>;
  const createdAt = typeof raw.createdAt === 'string' && raw.createdAt.length > 0 ? raw.createdAt : isoNow();
  const updatedAt = typeof raw.updatedAt === 'string' && raw.updatedAt.length > 0 ? raw.updatedAt : createdAt;

  return {
    id: typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : `imported-${index + 1}-${createId()}`,
    name: sanitizePresetName(raw.name),
    createdAt,
    updatedAt,
    data: normalizePresetData(raw.data),
  };
}

function normalizeLibrary(value: unknown): PresetLibrary | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const raw = value as Partial<PresetLibrary>;
  const presets = Array.isArray(raw.presets)
    ? raw.presets.map((preset, index) => normalizeNamedPreset(preset, index))
    : [];

  if (presets.length === 0) {
    return null;
  }

  const selectedPresetId = typeof raw.selectedPresetId === 'string' && presets.some((preset) => preset.id === raw.selectedPresetId)
    ? raw.selectedPresetId
    : presets[0].id;

  return {
    version: 1,
    migratedLegacy: Boolean(raw.migratedLegacy),
    selectedPresetId,
    presets,
  };
}

function createDefaultLibrary(): PresetLibrary {
  const preset = createNamedPreset('Default', DEFAULT_PRESET_DATA);

  return {
    version: 1,
    migratedLegacy: false,
    selectedPresetId: preset.id,
    presets: [preset],
  };
}

function hasLegacyPreset(): boolean {
  return Object.values(LEGACY_KEYS).some((key) => localStorage.getItem(key) !== null);
}

function readLegacyPresetData(): PresetData {
  return normalizePresetData({
    bpm: localStorage.getItem(LEGACY_KEYS.bpm),
    numerator: localStorage.getItem(LEGACY_KEYS.numerator),
    denominator: localStorage.getItem(LEGACY_KEYS.denominator),
    waveform: localStorage.getItem(LEGACY_KEYS.waveform),
    sequenceInput: localStorage.getItem(LEGACY_KEYS.sequenceInput),
    octave: localStorage.getItem(LEGACY_KEYS.octave),
    lengthFactor: localStorage.getItem(LEGACY_KEYS.lengthFactor),
    forte: localStorage.getItem(LEGACY_KEYS.forte),
  });
}

function migrateLegacyPreset(): PresetLibrary | null {
  if (!hasLegacyPreset()) {
    return null;
  }

  const migratedPreset = createNamedPreset('Migrated preset', readLegacyPresetData());

  return {
    version: 1,
    migratedLegacy: true,
    selectedPresetId: migratedPreset.id,
    presets: [migratedPreset],
  };
}

export function loadPresetLibrary(): PresetLibrary {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      const library = normalizeLibrary(parsed);
      if (library) {
        return library;
      }
    }
  } catch (error) {
    console.warn('Failed to read stored preset library, resetting to defaults.', error);
  }

  const migratedLibrary = migrateLegacyPreset();
  const library = migratedLibrary ?? createDefaultLibrary();
  savePresetLibrary(library);
  return library;
}

export function savePresetLibrary(library: PresetLibrary): void {
  const normalizedLibrary = normalizeLibrary(library) ?? createDefaultLibrary();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedLibrary));
}

export function getSelectedPreset(library: PresetLibrary): NamedPreset {
  return library.presets.find((preset) => preset.id === library.selectedPresetId) ?? library.presets[0];
}

export function updatePresetData(preset: NamedPreset, data: PresetData): NamedPreset {
  return {
    ...preset,
    updatedAt: isoNow(),
    data: normalizePresetData(data),
  };
}

export function buildDraftFromUrl(search: string, baseData: PresetData): PresetData {
  const params = new URLSearchParams(search);
  const firstTrack = baseData.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;

  return normalizePresetData({
    bpm: params.get('bpm') ?? baseData.bpm,
    forte: params.get('forte') ?? baseData.forte,
    tracks: [
      {
        ...firstTrack,
        numerator: params.get('numerator') ?? firstTrack.numerator,
        denominator: params.get('denominator') ?? firstTrack.denominator,
        waveform: params.get('waveform') ?? firstTrack.waveform,
        sequenceInput: params.get('sequence') ?? firstTrack.sequenceInput,
        octave: params.get('octave') ?? firstTrack.octave,
        lengthFactor: params.get('lengthFactor') ?? firstTrack.lengthFactor,
        delay: params.get('delay') ?? firstTrack.delay,
        repeats: params.get('repeats') ?? firstTrack.repeats,
      },
      ...baseData.tracks.slice(1),
    ],
  });
}

export function hasUrlPresetOverrides(search: string): boolean {
  const params = new URLSearchParams(search);

  return ['bpm', 'numerator', 'denominator', 'waveform', 'sequence', 'octave', 'lengthFactor', 'forte', 'delay', 'repeats']
    .some((key) => params.has(key));
}

export function buildSinglePresetExport(preset: NamedPreset): SinglePresetExport {
  return {
    version: 1,
    kind: 'single-preset',
    exportedAt: isoNow(),
    preset: normalizeNamedPreset(preset, 0),
  };
}

export function buildPresetLibraryExport(library: PresetLibrary): PresetLibraryExport {
  return {
    version: 1,
    kind: 'preset-library',
    exportedAt: isoNow(),
    selectedPresetId: library.selectedPresetId,
    presets: library.presets.map((preset, index) => normalizeNamedPreset(preset, index)),
  };
}

export function parsePresetImportPayload(text: string): PresetImportPayload {
  const parsed = JSON.parse(text) as unknown;

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Preset file must contain a JSON object.');
  }

  const raw = parsed as Record<string, unknown>;
  if (raw.version !== 1) {
    throw new Error('Unsupported preset file version.');
  }

  if (raw.kind === 'single-preset') {
    return {
      version: 1,
      kind: 'single-preset',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : isoNow(),
      preset: normalizeNamedPreset(raw.preset, 0),
    };
  }

  if (raw.kind === 'preset-library') {
    if (!Array.isArray(raw.presets) || raw.presets.length === 0) {
      throw new Error('Preset library files must contain at least one preset.');
    }

    const presets = raw.presets.map((preset, index) => normalizeNamedPreset(preset, index));
    const selectedPresetId = typeof raw.selectedPresetId === 'string' && presets.some((preset) => preset.id === raw.selectedPresetId)
      ? raw.selectedPresetId
      : presets[0].id;

    return {
      version: 1,
      kind: 'preset-library',
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : isoNow(),
      selectedPresetId,
      presets,
    };
  }

  throw new Error('Unrecognized preset file format.');
}

function ensureUniqueName(existingNames: Set<string>, baseName: string): string {
  const candidate = sanitizePresetName(baseName);
  if (!existingNames.has(candidate)) {
    existingNames.add(candidate);
    return candidate;
  }

  let suffix = 2;
  while (existingNames.has(`${candidate} (${suffix})`)) {
    suffix += 1;
  }

  const uniqueName = `${candidate} (${suffix})`;
  existingNames.add(uniqueName);
  return uniqueName;
}

export function mergeImportedPresets(
  existingPresets: NamedPreset[],
  importedPresets: NamedPreset[],
  preferredSelectedPresetId: string | null = null,
): MergeImportedPresetsResult {
  const existingNames = new Set(existingPresets.map((preset) => preset.name));
  const existingIds = new Set(existingPresets.map((preset) => preset.id));
  const imported: NamedPreset[] = [];
  const idMap = new Map<string, string>();

  for (const preset of importedPresets) {
    const normalizedPreset = normalizeNamedPreset(preset, imported.length);
    let nextId = normalizedPreset.id;
    if (existingIds.has(nextId)) {
      nextId = createId();
    }
    existingIds.add(nextId);

    const mergedPreset: NamedPreset = {
      ...normalizedPreset,
      id: nextId,
      name: ensureUniqueName(existingNames, normalizedPreset.name),
    };

    idMap.set(normalizedPreset.id, nextId);
    imported.push(mergedPreset);
  }

  const selectedPresetId = preferredSelectedPresetId
    ? (idMap.get(preferredSelectedPresetId) ?? imported[0]?.id ?? null)
    : (imported[0]?.id ?? null);

  return {
    presets: [...existingPresets, ...imported],
    importedPresets: imported,
    selectedPresetId,
  };
}
