import assert from 'node:assert/strict';
import test from 'node:test';
import { interpolateTonewheelDrawbars, type TonewheelWavetable } from '../audio/tonewheelWavetable.js';
import { DEFAULT_PRESET_TRACK_DATA, normalizePresetTrackData } from '../presets.js';

function wavetable(values: number[]): TonewheelWavetable {
  return {
    enabled: true,
    dimensions: values.map((value, index) => ({ name: `Axis ${index + 1}`, value })),
    configurations: [],
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
