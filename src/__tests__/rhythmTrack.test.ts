import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDefaultRhythmLanes,
  decodeRhythmMasks,
  drumVoiceMidiNote,
  DRUM_FILTER_TYPE_OPTIONS,
  getDefaultDrumParameters,
  getDrumParameterDefinitions,
  createDefaultDrumLane,
  decodeRhythmSequence,
  getDrumXorGroupMembers,
  normalizeDrumLanes,
  normalizeDrumParameters,
  normalizeDrumVelocityBits,
  normalizeDrumXorGroup,
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
  assert.deepEqual(
    getDrumParameterDefinitions('snare').find((definition) => definition.name === 'tune'),
    { name: 'tune', label: 'Tune', min: 80, max: 400, step: 1 },
  );
  assert.equal(getDefaultDrumParameters('kick').echoSend, 0);
  assert.equal(getDefaultDrumParameters('kick').reverbSend, 0);
  assert.deepEqual(
    getDrumParameterDefinitions('kick').find((definition) => definition.name === 'echoSend'),
    { name: 'echoSend', label: 'Echo Send (dB)', min: -96, max: 0, step: 0.5 },
  );
});

test('normalizes per-drum effect sends in decibels', () => {
  const parameters = normalizeDrumParameters('snare', { echoSend: -18.5, reverbSend: -120 });

  assert.equal(parameters.echoSend, -18.5);
  assert.equal(parameters.reverbSend, -96);
  assert.equal(normalizeDrumParameters('snare', { echoSend: 6 }).echoSend, 0);
});

test('supports every Tone biquad filter type for drum voices', () => {
  const filterDefinition = getDrumParameterDefinitions('kick').find((definition) => definition.name === 'filterType');

  assert.deepEqual(filterDefinition?.options, DRUM_FILTER_TYPE_OPTIONS);
  assert.equal(normalizeDrumParameters('kick', { filterType: 'peaking' }).filterType, 'peaking');
  assert.equal(normalizeDrumParameters('kick', { filterType: 'notch' }).filterType, 'notch');
  assert.equal(normalizeDrumParameters('kick', { filterType: 'peak' }).filterType, 'lowpass');
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

  const constrained = normalizeDrumLanes([{ voiceId: 'snare', parameters: { tune: 1200 } }]);
  assert.equal(constrained[0].parameters.tune, 400);
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

test('defaults new lanes to no XOR group and normalizes invalid groups to none', () => {
  assert.equal(createDefaultDrumLane('hat').xorGroup, 0);
  assert.equal(normalizeDrumXorGroup(undefined), 0);
  assert.equal(normalizeDrumXorGroup(3), 3);
  assert.equal(normalizeDrumXorGroup(9), 0);
  assert.equal(normalizeDrumXorGroup(-1), 0);
  assert.equal(normalizeDrumXorGroup('2'), 0);

  const lanes = normalizeDrumLanes([
    { voiceId: 'hat', xorGroup: 1 },
    { voiceId: 'hatOpen', xorGroup: 99 },
  ]);
  assert.equal(lanes[0].xorGroup, 1);
  assert.equal(lanes[1].xorGroup, 0);
  assert.deepEqual(getDrumXorGroupMembers(lanes, 1), ['hat']);
});

test('keeps ungrouped same-step hits polyphonic', () => {
  const lanes = [createDefaultDrumLane('hat'), createDefaultDrumLane('hatOpen')];
  const steps = decodeRhythmMasks([3n], lanes, 1);

  assert.deepEqual(steps[0].map((hit) => hit.voiceId), ['hat', 'hatOpen']);
});

test('keeps only the highest grouped lane when two XOR members fire on the same step', () => {
  const hat = createDefaultDrumLane('hat');
  const hatOpen = createDefaultDrumLane('hatOpen');
  hat.xorGroup = 1;
  hatOpen.xorGroup = 1;
  const steps = decodeRhythmMasks([3n], [hat, hatOpen], 1);

  assert.deepEqual(steps[0].map((hit) => hit.voiceId), ['hatOpen']);
  assert.equal(steps[0][0].laneIndex, 1);
});
