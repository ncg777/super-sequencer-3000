export interface PresetData {
  bpm: number;
  numerator: number;
  denominator: number;
  waveform: string;
  sequenceInput: string;
  octave: number;
  lengthFactor: number;
  forte: string;
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

export const DEFAULT_PRESET_DATA: PresetData = {
  bpm: 90,
  numerator: 4,
  denominator: 5,
  waveform: 'sine',
  sequenceInput: '1 2 4 8 16',
  octave: 6,
  lengthFactor: 100,
  forte: '5-35.05',
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

function isoNow(): string {
  return new Date().toISOString();
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `preset-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function parseInteger(value: string | null | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeWaveform(value: unknown): PresetData['waveform'] {
  return typeof value === 'string' && WAVEFORMS.has(value) ? value : DEFAULT_PRESET_DATA.waveform;
}

export function clonePresetData(data: PresetData): PresetData {
  return {
    bpm: data.bpm,
    numerator: data.numerator,
    denominator: data.denominator,
    waveform: data.waveform,
    sequenceInput: data.sequenceInput,
    octave: data.octave,
    lengthFactor: data.lengthFactor,
    forte: data.forte,
  };
}

export function normalizePresetData(value: unknown): PresetData {
  const raw = (typeof value === 'object' && value !== null ? value : {}) as Partial<PresetData>;

  return {
    bpm: clamp(parseInteger(raw.bpm?.toString(), DEFAULT_PRESET_DATA.bpm), 1, 499),
    numerator: clamp(parseInteger(raw.numerator?.toString(), DEFAULT_PRESET_DATA.numerator), 1, 16),
    denominator: clamp(parseInteger(raw.denominator?.toString(), DEFAULT_PRESET_DATA.denominator), 1, 16),
    waveform: normalizeWaveform(raw.waveform),
    sequenceInput: typeof raw.sequenceInput === 'string' && raw.sequenceInput.trim().length > 0
      ? raw.sequenceInput
      : DEFAULT_PRESET_DATA.sequenceInput,
    octave: clamp(parseInteger(raw.octave?.toString(), DEFAULT_PRESET_DATA.octave), 0, 10),
    lengthFactor: clamp(parseInteger(raw.lengthFactor?.toString(), DEFAULT_PRESET_DATA.lengthFactor), 1, 400),
    forte: typeof raw.forte === 'string' && raw.forte.trim().length > 0 ? raw.forte : DEFAULT_PRESET_DATA.forte,
  };
}

export function arePresetDataEqual(left: PresetData, right: PresetData): boolean {
  return left.bpm === right.bpm
    && left.numerator === right.numerator
    && left.denominator === right.denominator
    && left.waveform === right.waveform
    && left.sequenceInput === right.sequenceInput
    && left.octave === right.octave
    && left.lengthFactor === right.lengthFactor
    && left.forte === right.forte;
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

  return normalizePresetData({
    bpm: params.get('bpm') ?? baseData.bpm,
    numerator: params.get('numerator') ?? baseData.numerator,
    denominator: params.get('denominator') ?? baseData.denominator,
    waveform: params.get('waveform') ?? baseData.waveform,
    sequenceInput: params.get('sequence') ?? baseData.sequenceInput,
    octave: params.get('octave') ?? baseData.octave,
    lengthFactor: params.get('lengthFactor') ?? baseData.lengthFactor,
    forte: params.get('forte') ?? baseData.forte,
  });
}

export function hasUrlPresetOverrides(search: string): boolean {
  const params = new URLSearchParams(search);

  return ['bpm', 'numerator', 'denominator', 'waveform', 'sequence', 'octave', 'lengthFactor', 'forte']
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
  let candidate = sanitizePresetName(baseName);
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