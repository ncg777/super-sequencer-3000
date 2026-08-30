import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS,
  KARPLUS_MODAL_MODE_COUNT,
  planKarplusModalBank,
  planKarplusWaveguide,
} from '../audio/karplusStrongModalSynth.js';
import {
  arePresetDataEqual,
  clonePresetData,
  clonePresetTrackData,
  DEFAULT_PRESET_DATA,
  normalizePresetTrackData,
} from '../presets.js';

test('waveguide planning is tuned, stable, and responds to physical decay', () => {
  const settings = { ...DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS };
  const plan = planKarplusWaveguide(440, 48_000, settings);

  assert.ok(plan.delaySeconds > 0);
  assert.ok(plan.delaySeconds < 1 / 440);
  assert.ok(plan.feedback > 0 && plan.feedback < 1);
  assert.ok(plan.dampingFrequency > 440);
  assert.ok(plan.dampingFrequency < 24_000);
  assert.ok(Math.abs(plan.pickDelaySeconds - settings.pickPosition / 440) < 1e-12);

  const shortDecay = planKarplusWaveguide(440, 48_000, { ...settings, decay: 0.2 });
  const longDecay = planKarplusWaveguide(440, 48_000, { ...settings, decay: 20 });
  assert.ok(shortDecay.feedback < plan.feedback);
  assert.ok(longDecay.feedback > plan.feedback);
  assert.ok(longDecay.feedback < 1);
});

test('modal bank is ordered, inharmonic, bounded, and body-size aware', () => {
  const settings = { ...DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS };
  const modes = planKarplusModalBank(220, 48_000, settings);

  assert.equal(modes.length, KARPLUS_MODAL_MODE_COUNT);
  assert.ok(modes.every((mode) => mode.frequency > 0 && mode.frequency < 24_000));
  assert.ok(modes.every((mode) => mode.q >= 0.5 && mode.q <= 180));
  assert.ok(modes.every((mode) => mode.gain > 0));
  assert.ok(modes.every((mode, index) => index === 0 || mode.frequency > modes[index - 1].frequency));
  assert.notEqual(modes[1].frequency / modes[0].frequency, 2);

  const largeBody = planKarplusModalBank(220, 48_000, { ...settings, bodySize: 1 });
  const smallBody = planKarplusModalBank(220, 48_000, { ...settings, bodySize: 0 });
  assert.ok(largeBody[0].frequency < smallBody[0].frequency);
});

test('physical-model presets normalize, clone, and compare without shared state', () => {
  const normalized = normalizePresetTrackData({
    generatorType: 'karplus-modal',
    karplusStrongModalSynth: {
      exciterType: 'invalid',
      exciterDuration: 10,
      pickPosition: -2,
      decay: 100,
      damping: 5,
      dispersion: -1,
      bodySize: 3,
      bodyDecay: 0,
      bodyMix: 4,
      stringMix: -1,
    },
  });

  assert.equal(normalized.generatorType, 'karplus-modal');
  assert.deepEqual(normalized.karplusStrongModalSynth, {
    ...DEFAULT_KARPLUS_STRONG_MODAL_SETTINGS,
    exciterDuration: 0.12,
    pickPosition: 0.02,
    decay: 30,
    damping: 1,
    dispersion: 0,
    bodySize: 1,
    bodyDecay: 0.08,
    bodyMix: 1,
    stringMix: 0,
  });

  const clone = clonePresetTrackData(normalized);
  clone.karplusStrongModalSynth.decay = 7;
  assert.equal(normalized.karplusStrongModalSynth.decay, 30);

  const saved = clonePresetData(DEFAULT_PRESET_DATA);
  const draft = clonePresetData(saved);
  draft.tracks[0].karplusStrongModalSynth.bodySize = 0.9;
  assert.equal(arePresetDataEqual(saved, draft), false);
});