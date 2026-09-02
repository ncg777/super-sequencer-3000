import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PULSE_DUTY,
  getFluteHarmonicAmplitude,
  getPulseHarmonicAmplitude,
  isPulseWaveform,
} from '../audio/spectra.js';

test('flute spectrum is compact and fundamental-led', () => {
  assert.equal(getFluteHarmonicAmplitude(1), 1);
  assert.ok(getFluteHarmonicAmplitude(2) < getFluteHarmonicAmplitude(1));
  assert.equal(getFluteHarmonicAmplitude(6), 0);
  assert.equal(getFluteHarmonicAmplitude(0), 0);
});

test('pulse spectra use fixed duty cycles and reject unrelated waveforms', () => {
  assert.equal(isPulseWaveform('pulse-25'), true);
  assert.equal(isPulseWaveform('pulse-12'), true);
  assert.equal(isPulseWaveform('square'), false);
  assert.ok(Math.abs(getPulseHarmonicAmplitude(PULSE_DUTY['pulse-25'], 4)) < Number.EPSILON);
  assert.ok(getPulseHarmonicAmplitude(PULSE_DUTY['pulse-12'], 1) > 0);
});