import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_FM_SETTINGS,
  FM_ALGORITHMS,
} from '../audio/fourOperatorFmSynth.js';
import {
  arePresetDataEqual,
  clonePresetData,
  clonePresetTrackData,
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  normalizePresetTrackData,
} from '../presets.js';

test('all FM algorithms use four valid operators and an acyclic modulation graph', () => {
  assert.equal(FM_ALGORITHMS.length, 8);
  assert.deepEqual(FM_ALGORITHMS.map((algorithm) => algorithm.value), [1, 2, 3, 4, 5, 6, 7, 8]);

  for (const algorithm of FM_ALGORITHMS) {
    assert.ok(algorithm.carriers.length > 0);
    assert.ok(algorithm.carriers.every((operator) => operator >= 0 && operator < 4));
    assert.equal(new Set(algorithm.carriers).size, algorithm.carriers.length);

    const routesBySource = new Map<number, number[]>();
    for (const route of algorithm.routes) {
      assert.ok(route.from >= 0 && route.from < 4);
      assert.ok(route.to >= 0 && route.to < 4);
      assert.notEqual(route.from, route.to);
      routesBySource.set(route.from, [...(routesBySource.get(route.from) ?? []), route.to]);
    }

    const visiting = new Set<number>();
    const visited = new Set<number>();
    const visit = (operator: number) => {
      assert.equal(visiting.has(operator), false, `algorithm ${algorithm.value} contains a cycle`);
      if (visited.has(operator)) {
        return;
      }
      visiting.add(operator);
      for (const target of routesBySource.get(operator) ?? []) {
        visit(target);
      }
      visiting.delete(operator);
      visited.add(operator);
    };
    for (let operator = 0; operator < 4; operator += 1) {
      visit(operator);
    }
  }
});

test('legacy tracks remain tonewheel tracks and receive the default FM patch', () => {
  const normalized = normalizePresetTrackData({ waveform: 'square' });

  assert.equal(normalized.generatorType, 'tonewheel');
  assert.deepEqual(normalized.fmSynth, DEFAULT_FM_SETTINGS);
  assert.equal(normalized.waveform, 'square');
});

test('FM preset normalization bounds every audio parameter and restores four operators', () => {
  const normalized = normalizePresetTrackData({
    generatorType: 'fm',
    fmSynth: {
      algorithm: 99,
      modulationIndex: 1000,
      feedback: -2,
      operators: [{
        ratio: 0,
        detune: 800,
        level: 4,
        waveform: 'invalid',
        attack: -1,
        decay: 40,
        sustain: -3,
        release: 99,
      }],
    },
  });

  assert.equal(normalized.generatorType, 'fm');
  assert.equal(normalized.fmSynth.algorithm, 8);
  assert.equal(normalized.fmSynth.modulationIndex, 32);
  assert.equal(normalized.fmSynth.feedback, 0);
  assert.equal(normalized.fmSynth.operators.length, 4);
  assert.deepEqual(normalized.fmSynth.operators[0], {
    ratio: 0.125,
    detune: 100,
    level: 1,
    waveform: DEFAULT_FM_SETTINGS.operators[0].waveform,
    attack: 0,
    decay: 10,
    sustain: 0,
    release: 20,
  });
  assert.deepEqual(normalized.fmSynth.operators[3], DEFAULT_FM_SETTINGS.operators[3]);
});

test('cloned FM settings do not mutate the source or defaults', () => {
  const source = normalizePresetTrackData({ generatorType: 'fm' });
  const clone = clonePresetTrackData(source);

  clone.fmSynth.operators[0].ratio = 12;
  clone.fmSynth.operators[1].waveform = 'square';

  assert.equal(source.fmSynth.operators[0].ratio, DEFAULT_FM_SETTINGS.operators[0].ratio);
  assert.equal(source.fmSynth.operators[1].waveform, DEFAULT_FM_SETTINGS.operators[1].waveform);
  assert.equal(DEFAULT_PRESET_TRACK_DATA.fmSynth.operators[0].ratio, DEFAULT_FM_SETTINGS.operators[0].ratio);
});

test('preset equality detects generator and FM-only edits', () => {
  const saved = clonePresetData(DEFAULT_PRESET_DATA);
  const draft = clonePresetData(saved);

  assert.equal(arePresetDataEqual(saved, draft), true);
  draft.tracks[0].generatorType = 'fm';
  assert.equal(arePresetDataEqual(saved, draft), false);

  saved.tracks[0].generatorType = 'fm';
  assert.equal(arePresetDataEqual(saved, draft), true);
  draft.tracks[0].fmSynth.operators[2].ratio = 9;
  assert.equal(arePresetDataEqual(saved, draft), false);
});