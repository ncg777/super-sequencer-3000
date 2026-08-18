import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultRhythmLanes,
  decodeRhythmMasks,
  drumVoiceMidiNote,
  getDefaultDrumParameters,
  getDrumParameterDefinitions,
  createDefaultDrumLane,
  decodeRhythmSequence,
  normalizeDrumLanes,
  normalizeDrumVelocityBits,
  parseRhythmSequenceInput,
} from '../domain/rhythmTrack.js';

test('uses the standard GM note mapping for the default lanes', () => {
  const lanes = createDefaultRhythmLanes();

  assert.deepEqual(lanes.map((lane) => lane.voiceId), ['kick', 'snare', 'hat', 'hatOpen', 'crash']);
  assert.deepEqual(lanes.map((lane) => drumVoiceMidiNote(lane.voiceId)), [36, 38, 42, 46, 49]);
  assert.equal(getDefaultDrumParameters('kick').tune, 55);
  assert.ok(getDrumParameterDefinitions('snare').some((definition) => definition.name === 'noiseType'));
  assert.ok(getDrumParameterDefinitions('snare').some((definition) => definition.name === 'toneDecay'));
  assert.equal(getDrumParameterDefinitions('kick').find((definition) => definition.name === 'tune')?.max, 400);
});

test('normalizes lanes to unique known voices with complete defaults', () => {
  const lanes = normalizeDrumLanes([
    { voiceId: 'snare', parameters: { tune: 220 } },
    { voiceId: 'snare', parameters: { tune: 440 } },
    { voiceId: 'not-a-voice', parameters: {} },
  ]);

  assert.equal(lanes.length, 1);
  assert.equal(lanes[0].voiceId, 'snare');
  assert.equal(lanes[0].parameters.tune, 220);
  assert.equal(lanes[0].parameters.noiseType, 'white');
});

test('parses decimal masks without losing arbitrary-width values', () => {
  const parsed = parseRhythmSequenceInput('1 32 1024 18446744073709551616 foo -2 01');

  assert.equal(parsed.valid, false);
  assert.deepEqual(parsed.invalidTokens, ['foo', '-2', '01']);
  assert.deepEqual(parsed.masks, [1n, 32n, 1024n, 18446744073709551616n]);
  assert.equal(parsed.normalizedInput, '1 32 1024 18446744073709551616');
});

test('decodes least-significant lane bitfields and normalized velocity', () => {
  const lanes = createDefaultRhythmLanes().slice(0, 3);
  const steps = decodeRhythmMasks([1n, 2n, 3n, 4n, 7n], lanes, 1);

  assert.deepEqual(steps[0].map((hit) => hit.midi), [36]);
  assert.deepEqual(steps[1].map((hit) => hit.midi), [38]);
  assert.deepEqual(steps[2].map((hit) => hit.midi), [36, 38]);
  assert.deepEqual(steps[3].map((hit) => hit.midi), [42]);
  assert.deepEqual(steps[4].map((hit) => hit.velocity), [1, 1, 1]);
});

test('lane order determines which GM voice receives bit zero', () => {
  const lanes = [createDefaultDrumLane('snare'), createDefaultDrumLane('kick')];
  const steps = decodeRhythmSequence('1 2', lanes, 1);

  assert.deepEqual(steps[0].map((hit) => hit.voiceId), ['snare']);
  assert.deepEqual(steps[1].map((hit) => hit.voiceId), ['kick']);
});

test('decodes multi-bit velocity fields per lane', () => {
  const lanes = createDefaultRhythmLanes().slice(0, 2);
  const steps = decodeRhythmMasks([1n, 2n, 3n, 4n, 12n, 63n], lanes, 2);

  assert.deepEqual(steps[0].map((hit) => hit.velocity), [1 / 3]);
  assert.deepEqual(steps[1].map((hit) => hit.velocity), [2 / 3]);
  assert.deepEqual(steps[2].map((hit) => hit.velocity), [1]);
  assert.deepEqual(steps[3].map((hit) => hit.velocity), [1 / 3]);
  assert.deepEqual(steps[4].map((hit) => hit.velocity), [1]);
  assert.deepEqual(steps[5].map((hit) => hit.velocity), [1, 1]);
});

test('clamps velocity bit counts to the supported Beatbox range', () => {
  assert.equal(normalizeDrumVelocityBits(0), 1);
  assert.equal(normalizeDrumVelocityBits(4.9), 4);
  assert.equal(normalizeDrumVelocityBits(99), 7);
  assert.equal(normalizeDrumVelocityBits('4'), 1);
});
