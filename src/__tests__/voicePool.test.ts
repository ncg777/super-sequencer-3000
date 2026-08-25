import assert from 'node:assert/strict';
import test from 'node:test';

import { claimVoices, getSynthVoiceCount, type SoundingNote } from '../audio/voicePool.js';

test('allocates more Tone voices than the musical voice count so release tails never drop a note', () => {
  assert.ok(getSynthVoiceCount(1) > 1);
  assert.ok(getSynthVoiceCount(8) > 8);
  assert.equal(getSynthVoiceCount(32), 32);
});

test('claims voices without stealing while the track stays inside its polyphony', () => {
  const sounding: SoundingNote[] = [];
  assert.deepEqual(claimVoices(sounding, [220, 330], 0, 1, 4), []);
  assert.deepEqual(claimVoices(sounding, [440], 0.5, 1.5, 4), []);
  assert.equal(sounding.length, 3);
});

test('retires notes that already ended instead of counting them as voices', () => {
  const sounding: SoundingNote[] = [];
  claimVoices(sounding, [220, 330], 0, 1, 2);
  assert.deepEqual(claimVoices(sounding, [440, 550], 1, 2, 2), []);
  assert.deepEqual(sounding.map((note) => note.frequency), [440, 550]);
});

test('steals the oldest sounding note instead of letting the new one be dropped', () => {
  const sounding: SoundingNote[] = [];
  claimVoices(sounding, [220, 330], 0, 4, 2);
  assert.deepEqual(claimVoices(sounding, [440], 1, 5, 2), [220]);
  assert.deepEqual(sounding.map((note) => note.frequency), [330, 440]);
});

test('leaves a restruck pitch for last so its queued release cannot cut the new voice', () => {
  const sounding: SoundingNote[] = [];
  claimVoices(sounding, [220, 330], 0, 4, 2);
  assert.deepEqual(claimVoices(sounding, [220], 1, 5, 2), [330]);
  assert.deepEqual(sounding.map((note) => note.frequency), [220, 220]);
});
