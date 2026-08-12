import assert from 'node:assert/strict';
import test from 'node:test';

import { CHOIR_FORMANT_GAIN_COMPENSATION_DB, getChoirFormantBandGainLinear } from '../audio/choir';

test('choir formant gain compensation keeps vowel peaks audible', () => {
  const quietBand = getChoirFormantBandGainLinear(-20);
  const peakBand = getChoirFormantBandGainLinear(0);

  assert.ok(quietBand > 0.2, 'attenuated formants should still stay audible');
  assert.ok(peakBand > 1.4, 'peak formant gain should be boosted above unity');
  assert.ok(quietBand < peakBand, 'band gain should preserve relative formant balance');
  assert.ok(CHOIR_FORMANT_GAIN_COMPENSATION_DB > 0, 'formant output needs positive gain compensation');
});
