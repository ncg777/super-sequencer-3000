import assert from 'node:assert/strict';
import test from 'node:test';
import { getStepDurations } from '../audio/stepDurations.js';

test('precomputed durations preserve circular next-note timing for every short pattern', () => {
  for (let length = 0; length <= 8; length += 1) {
    for (let mask = 0; mask < 2 ** length; mask += 1) {
      const notes = Array.from({ length }, (_, index) => mask & (1 << index) ? [60] : []);
      const expected = notes.map((_, index) => {
        for (let offset = 1; offset < notes.length; offset += 1) {
          if (notes[(index + offset) % notes.length].length > 0) {
            return offset;
          }
        }
        return 1;
      });
      assert.deepEqual(getStepDurations(notes), expected, `length=${length}, mask=${mask}`);
    }
  }
});