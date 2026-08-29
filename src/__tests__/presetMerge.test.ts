import assert from 'node:assert/strict';
import test from 'node:test';

import {
  clonePresetData,
  DEFAULT_PRESET_DATA,
  mergePresetTracks,
} from '../presets.js';

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