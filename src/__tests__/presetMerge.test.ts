import assert from 'node:assert/strict';
import test from 'node:test';

import {
  arePresetDataEqual,
  clonePresetData,
  DEFAULT_PRESET_DATA,
  mergePresetTracks,
  normalizePresetTrackData,
} from '../presets.js';

test('track fades default to off and normalize fractional bar durations', () => {
  assert.equal(normalizePresetTrackData({}).fadeIn, 0);
  assert.equal(normalizePresetTrackData({}).fadeOut, 0);
  assert.equal(normalizePresetTrackData({ fadeIn: 1.5, fadeOut: 2.25 }).fadeIn, 1.5);
  assert.equal(normalizePresetTrackData({ fadeIn: -1, fadeOut: 100 }).fadeOut, 64);

  const changed = clonePresetData(DEFAULT_PRESET_DATA);
  changed.tracks[0].fadeIn = 1;
  assert.equal(arePresetDataEqual(changed, DEFAULT_PRESET_DATA), false);
});

test('track sequence padding defaults to zero and normalizes fractional bar durations', () => {
  const defaults = normalizePresetTrackData({});
  assert.equal(defaults.paddingBefore, 0);
  assert.equal(defaults.paddingAfter, 0);

  const normalized = normalizePresetTrackData({ paddingBefore: 1.5, paddingAfter: 2.25 });
  assert.equal(normalized.paddingBefore, 1.5);
  assert.equal(normalized.paddingAfter, 2.25);

  const changed = clonePresetData(DEFAULT_PRESET_DATA);
  changed.tracks[0].paddingAfter = 1;
  assert.equal(arePresetDataEqual(changed, DEFAULT_PRESET_DATA), false);
});

test('legacy synth fields are discarded while breath controls are normalized', () => {
  const normalized = normalizePresetTrackData({
    generatorType: 'fm',
    fmSynth: { algorithm: 8 },
    virtualAnalogSynth: { drift: 25 },
    breathEnabled: true,
    breathLevel: -100,
    breathHarmonic: 99,
  });

  assert.equal('generatorType' in normalized, false);
  assert.equal('fmSynth' in normalized, false);
  assert.equal('virtualAnalogSynth' in normalized, false);
  assert.equal(normalized.breathEnabled, true);
  assert.equal(normalized.breathLevel, -60);
  assert.equal(normalized.breathHarmonic, 8);
});

test('mergePresetTracks appends independent tracks with unique IDs and names', () => {
  const current = clonePresetData(DEFAULT_PRESET_DATA);
  current.bpm = 111;
  current.bitmaskSequenceInput = '1 0';
  current.tracks[0].id = 'shared-track';
  current.tracks[0].name = 'Lead';

  const source = clonePresetData(DEFAULT_PRESET_DATA);
  source.bpm = 222;
  source.bitmaskSequenceInput = '7 3';
  source.reverb.wet = -30;
  source.tracks = [
    { ...source.tracks[0], id: 'shared-track', name: 'Lead', waveform: 'square' },
    { ...source.tracks[0], id: 'source-track-2', name: 'Lead', waveform: 'triangle' },
  ];

  const merged = mergePresetTracks(current, source);

  assert.equal(merged.bpm, current.bpm);
  assert.equal(merged.bitmaskSequenceInput, current.bitmaskSequenceInput);
  assert.deepEqual(merged.reverb, current.reverb);
  assert.deepEqual(merged.tracks.map((track) => track.name), ['Lead', 'Lead (2)', 'Lead (3)']);
  assert.deepEqual(merged.tracks.map((track) => track.waveform), ['sine', 'square', 'triangle']);
  assert.equal(new Set(merged.tracks.map((track) => track.id)).size, 3);
  assert.notEqual(merged.tracks[1].id, source.tracks[0].id);
  assert.notEqual(merged.tracks[2].id, source.tracks[1].id);

  merged.tracks[1].tonewheelDrawbars[0] = 8;
  assert.equal(source.tracks[0].tonewheelDrawbars[0], 0);
  assert.equal(current.tracks.length, 1);
});