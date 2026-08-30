import assert from 'node:assert/strict';
import test from 'node:test';

import { buildTrackFadeEnvelope, getTrackFadeGain } from '../audio/trackFade.js';

test('track fade envelope is disabled when both bar durations are zero', () => {
  assert.deepEqual(buildTrackFadeEnvelope(8, 0, 0), []);
});

test('track fade envelope creates independent linear fade in and out ramps', () => {
  assert.deepEqual(buildTrackFadeEnvelope(8, 2, 3), [
    { time: 0, gain: 0 },
    { time: 2, gain: 1 },
    { time: 5, gain: 1 },
    { time: 8, gain: 0 },
  ]);
});

test('overlapping track fades meet below unity without a discontinuity', () => {
  assert.deepEqual(buildTrackFadeEnvelope(4, 3, 3), [
    { time: 0, gain: 0 },
    { time: 2, gain: 2 / 3 },
    { time: 4, gain: 0 },
  ]);
  assert.equal(getTrackFadeGain(2, 4, 3, 3), 2 / 3);
});