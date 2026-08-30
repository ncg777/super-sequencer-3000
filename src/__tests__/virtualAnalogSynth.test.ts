import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_VIRTUAL_ANALOG_SETTINGS,
  getVirtualAnalogFrequencyRatio,
  getVirtualAnalogUnisonDetune,
  getVirtualAnalogUnisonPan,
  shouldStartVirtualAnalogMember,
} from '../audio/virtualAnalogSynth.js';
import {
  arePresetDataEqual,
  clonePresetData,
  clonePresetTrackData,
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  normalizePresetTrackData,
} from '../presets.js';

test('virtual-analog tuning and unison helpers produce symmetric voices', () => {
  assert.equal(getVirtualAnalogFrequencyRatio(1, 0), 2);
  assert.equal(getVirtualAnalogFrequencyRatio(-1, 0), 0.5);
  assert.ok(Math.abs(getVirtualAnalogFrequencyRatio(0, 7) - 1.498307) < 0.000001);
  assert.deepEqual(
    [0, 1, 2].map((index) => getVirtualAnalogUnisonDetune(index, 3, 20)),
    [-10, 0, 10],
  );
  assert.deepEqual(
    [0, 1, 2].map((index) => getVirtualAnalogUnisonPan(index, 3, 0, 0.75)),
    [-0.75, 0, 0.75],
  );
  assert.equal(getVirtualAnalogUnisonPan(0, 1, 2, 1), 1);
});

test('virtual-analog voices start only configured oscillator members', () => {
  const twoVoiceOscillator = { ...DEFAULT_VIRTUAL_ANALOG_SETTINGS.oscillators[0], unisonVoices: 2 };
  assert.deepEqual(
    [0, 1, 2, 3].map((memberIndex) => shouldStartVirtualAnalogMember(twoVoiceOscillator, memberIndex)),
    [true, true, false, false],
  );

  const disabledOscillator = { ...twoVoiceOscillator, enabled: false };
  assert.deepEqual(
    [0, 1, 2, 3].map((memberIndex) => shouldStartVirtualAnalogMember(disabledOscillator, memberIndex)),
    [false, false, false, false],
  );
});

test('legacy tracks remain tonewheel tracks and receive the default virtual-analog patch', () => {
  const normalized = normalizePresetTrackData({ waveform: 'square' });

  assert.equal(normalized.generatorType, 'tonewheel');
  assert.deepEqual(normalized.virtualAnalogSynth, DEFAULT_VIRTUAL_ANALOG_SETTINGS);
});

test('virtual-analog normalization bounds every oscillator and restores missing sources', () => {
  const normalized = normalizePresetTrackData({
    generatorType: 'virtual-analog',
    virtualAnalogSynth: {
      drift: 200,
      driftRate: 0,
      ringMod: -5,
      ringModPan: 4,
      oscillators: [{
        enabled: true,
        waveform: 'invalid',
        octave: 10,
        semitone: -99,
        detune: 900,
        level: 5,
        pan: -8,
        phase: 900,
        unisonVoices: 100,
        unisonDetune: -20,
        stereoSpread: 4,
        pulseWidth: 0,
        pwmRate: 50,
        pwmDepth: 2,
      }],
      sub: { waveform: 'pulse', octave: 4, level: 3 },
      noise: { type: 'blue', level: -2 },
    },
  });

  assert.equal(normalized.generatorType, 'virtual-analog');
  assert.equal(normalized.virtualAnalogSynth.oscillators.length, 3);
  assert.deepEqual(normalized.virtualAnalogSynth.oscillators[0], {
    enabled: true,
    waveform: DEFAULT_VIRTUAL_ANALOG_SETTINGS.oscillators[0].waveform,
    octave: 3,
    semitone: -12,
    detune: 100,
    level: 1,
    pan: -1,
    phase: 360,
    unisonVoices: 4,
    unisonDetune: 0,
    stereoSpread: 1,
    pulseWidth: 0.05,
    pwmRate: 20,
    pwmDepth: 0.45,
  });
  assert.deepEqual(normalized.virtualAnalogSynth.oscillators[2], DEFAULT_VIRTUAL_ANALOG_SETTINGS.oscillators[2]);
  assert.equal(normalized.virtualAnalogSynth.drift, 25);
  assert.equal(normalized.virtualAnalogSynth.driftRate, 0.01);
  assert.equal(normalized.virtualAnalogSynth.ringMod, 0);
  assert.equal(normalized.virtualAnalogSynth.ringModPan, 1);
  assert.equal(normalized.virtualAnalogSynth.sub.waveform, DEFAULT_VIRTUAL_ANALOG_SETTINGS.sub.waveform);
  assert.equal(normalized.virtualAnalogSynth.sub.octave, 0);
  assert.equal(normalized.virtualAnalogSynth.sub.level, 1);
  assert.equal(normalized.virtualAnalogSynth.noise.type, DEFAULT_VIRTUAL_ANALOG_SETTINGS.noise.type);
  assert.equal(normalized.virtualAnalogSynth.noise.level, 0);
});

test('cloned virtual-analog settings do not share nested source objects', () => {
  const source = normalizePresetTrackData({ generatorType: 'virtual-analog' });
  const clone = clonePresetTrackData(source);

  clone.virtualAnalogSynth.oscillators[0].waveform = 'square';
  clone.virtualAnalogSynth.sub.level = 0.9;
  clone.virtualAnalogSynth.noise.type = 'white';

  assert.equal(source.virtualAnalogSynth.oscillators[0].waveform, 'sawtooth');
  assert.equal(source.virtualAnalogSynth.sub.level, DEFAULT_VIRTUAL_ANALOG_SETTINGS.sub.level);
  assert.equal(source.virtualAnalogSynth.noise.type, DEFAULT_VIRTUAL_ANALOG_SETTINGS.noise.type);
  assert.equal(DEFAULT_PRESET_TRACK_DATA.virtualAnalogSynth.oscillators[0].waveform, 'sawtooth');
});

test('preset equality detects virtual-analog-only edits', () => {
  const saved = clonePresetData(DEFAULT_PRESET_DATA);
  const draft = clonePresetData(saved);

  draft.tracks[0].generatorType = 'virtual-analog';
  assert.equal(arePresetDataEqual(saved, draft), false);
  saved.tracks[0].generatorType = 'virtual-analog';
  assert.equal(arePresetDataEqual(saved, draft), true);
  draft.tracks[0].virtualAnalogSynth.oscillators[2].pulseWidth = 0.7;
  assert.equal(arePresetDataEqual(saved, draft), false);
});

