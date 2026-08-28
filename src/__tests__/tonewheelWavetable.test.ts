import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getModulatedTonewheelPosition,
  interpolateTonewheelDrawbars,
  type TonewheelWavetable,
  type TonewheelWavetableLfo,
} from '../audio/tonewheelWavetable.js';
import { DEFAULT_PRESET_TRACK_DATA, normalizePresetTrackData } from '../presets.js';

function wavetable(values: number[]): TonewheelWavetable {
  return {
    enabled: true,
    dimensions: values.map((value, index) => ({ name: `Axis ${index + 1}`, value })),
    configurations: [],
    lfos: [],
  };
}

function vectorLfo(overrides: Partial<TonewheelWavetableLfo> = {}): TonewheelWavetableLfo {
  return {
    name: 'Vector LFO',
    enabled: true,
    waveform: 'sine',
    sync: false,
    rateHz: 1,
    syncRate: '1/4',
    phase: 0,
    depth: 0.5,
    polarity: 'bipolar',
    retrigger: 'free',
    smoothing: 0,
    fmSource: -1,
    fmAmount: 0,
    routes: [1],
    ...overrides,
  };
}

test('legacy presets retain their drawbars with wavetable morphing disabled', () => {
  const normalized = normalizePresetTrackData({ tonewheelDrawbars: [8, 7, 6, 5, 4, 3, 2, 1, 0] });

  assert.deepEqual(normalized.tonewheelDrawbars, [8, 7, 6, 5, 4, 3, 2, 1, 0]);
  assert.deepEqual(normalized.tonewheelWavetable, DEFAULT_PRESET_TRACK_DATA.tonewheelWavetable);
});

test('returns an exact configuration at its position', () => {
  const table = wavetable([1, 0]);
  table.configurations = [
    { name: 'A', position: [0, 0], drawbars: Array(9).fill(0) },
    { name: 'B', position: [1, 0], drawbars: Array(9).fill(8) },
  ];

  assert.deepEqual(interpolateTonewheelDrawbars(table, Array(9).fill(4)), Array(9).fill(8));
});

test('crossfades sparse configurations across arbitrary dimensions', () => {
  const table = wavetable([0.5, 0.5, 0.5]);
  table.configurations = [
    { name: 'Dark', position: [0, 0, 0], drawbars: Array(9).fill(0) },
    { name: 'Bright', position: [1, 1, 1], drawbars: Array(9).fill(8) },
  ];

  assert.deepEqual(interpolateTonewheelDrawbars(table, Array(9).fill(2)), Array(9).fill(4));
});

test('normalization clamps imported wavetable values and fills missing coordinates', () => {
  const normalized = normalizePresetTrackData({
    tonewheelWavetable: {
      enabled: true,
      dimensions: [{ name: '', value: 2 }, { name: 'Body', value: -1 }],
      configurations: [{ name: '', position: [0.25], drawbars: Array(9).fill(12) }],
      lfos: [],
    },
  });
  assert.deepEqual(normalized.tonewheelWavetable.dimensions, [
    { name: 'Morph 1', value: 1 },
    { name: 'Body', value: 0 },
  ]);
  assert.deepEqual(normalized.tonewheelWavetable.configurations[0], {
    name: 'Configuration 1',
    position: [0.25, 0],
    drawbars: Array(9).fill(8),
  });
});

test('normalization accepts song retrigger and migrates removed bar retrigger values', () => {
  const normalizeRetrigger = (retrigger: string) => normalizePresetTrackData({
    tonewheelWavetable: {
      enabled: true,
      dimensions: [{ name: 'X', value: 0.5 }],
      configurations: [{ name: 'A', position: [0], drawbars: Array(9).fill(4) }],
      lfos: [vectorLfo({ retrigger: retrigger as TonewheelWavetableLfo['retrigger'] })],
    },
  }).tonewheelWavetable.lfos[0].retrigger;

  assert.equal(normalizeRetrigger('song'), 'song');
  assert.equal(normalizeRetrigger('bar'), 'song');
});

test('routes tempo-synced bipolar modulation independently across dimensions', () => {
    const table = wavetable([0.5, 0.5]);
    table.lfos = [vectorLfo({ sync: true, syncRate: '1/4', routes: [0.5, -1] })];

    assert.deepEqual(
      getModulatedTonewheelPosition(table, { timeSeconds: 0.125, bpm: 120 }),
      [0.75, 0],
    );
});

test('supports deterministic cascaded frequency modulation between vector LFOs', () => {
    const table = wavetable([0]);
    table.lfos = [
      vectorLfo({ phase: 0.25, depth: 1, routes: [0] }),
      vectorLfo({ fmSource: 0, fmAmount: 0.25, depth: 1, routes: [1] }),
    ];

    assert.equal(getModulatedTonewheelPosition(table, { timeSeconds: 0, bpm: 120 })[0], 1);
});

test('note retrigger resets LFO phase while free-running LFOs retain transport phase', () => {
    const table = wavetable([0.5]);
    table.lfos = [vectorLfo({ retrigger: 'note' })];

    assert.equal(getModulatedTonewheelPosition(table, {
      timeSeconds: 10,
      noteStartSeconds: 10,
      bpm: 120,
    })[0], 0.5);
    assert.equal(getModulatedTonewheelPosition(table, {
      timeSeconds: 10.25,
      noteStartSeconds: 10,
      bpm: 120,
    })[0], 1);
});

test('song retrigger resets LFO phase only at the playback start epoch', () => {
    const table = wavetable([0.5]);
    table.lfos = [vectorLfo({ retrigger: 'song' })];

    assert.equal(getModulatedTonewheelPosition(table, {
      timeSeconds: 10,
      songStartSeconds: 10,
      bpm: 120,
    })[0], 0.5);
    assert.equal(getModulatedTonewheelPosition(table, {
      timeSeconds: 10.25,
      songStartSeconds: 10,
      bpm: 120,
    })[0], 1);
});

test('normalization clamps vector routes and prevents cyclic FM sources', () => {
    const normalized = normalizePresetTrackData({
      tonewheelWavetable: {
        enabled: true,
        dimensions: [{ name: 'X', value: 0.5 }],
        configurations: [{ name: 'A', position: [0], drawbars: Array(9).fill(4) }],
        lfos: [
          vectorLfo({ fmSource: 4, fmAmount: 99, routes: [2] }),
          vectorLfo({ fmSource: 0, rateHz: 99, routes: [-2] }),
        ],
      },
    });

    assert.equal(normalized.tonewheelWavetable.lfos[0].fmSource, -1);
    assert.equal(normalized.tonewheelWavetable.lfos[0].fmAmount, 4);
    assert.deepEqual(normalized.tonewheelWavetable.lfos.map((lfo) => lfo.routes), [[1], [-1]]);
    assert.equal(normalized.tonewheelWavetable.lfos[1].rateHz, 20);
});
