import assert from 'node:assert/strict';
import test from 'node:test';
import { renderWavChannels, type GenerateOptions } from './generate.js';
import { iterateWavChannelRenders, renderWavChannelsInPool } from './renderPool.js';

const options: GenerateOptions = {
  bpm: 180,
  tracks: Array.from({ length: 5 }, (_, index) => ({
    sequence: String(1 << index),
    denominator: 16,
    waveform: index % 2 === 0 ? 'pulse-25' : 'sine',
    fadeIn: 0.125,
    gain: -12 - index,
    reverbWet: -12 - index,
  })),
  reverb: { enabled: true, decay: 0.1, preDelay: 0, wet: -16 },
};

test('source workers render more tracks than workers in order without a serial fallback', async () => {
  const results = await renderWavChannelsInPool(options, 5, 2);
  assert.equal(results.length, 5);
  for (let index = 0; index < results.length; index += 1) {
    assert.deepEqual(results[index], await renderWavChannels(options, index));
  }
});

test('streamed pool can stop early and another export can complete', async () => {
  const iterator = iterateWavChannelRenders(options, 5, 2);
  const first = await iterator.next();
  assert.equal(first.done, false);
  await iterator.return(undefined);
  const results = await renderWavChannelsInPool(options, 2, 2);
  assert.equal(results.length, 2);
});