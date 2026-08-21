import type * as Tone from 'tone';

/**
 * Upper bound for a retained voice pool. Tone's own default polyphony is 32, so the
 * pool never holds more voices than the synth could have allocated anyway.
 */
export const MAX_POOLED_VOICES = 32;

interface PolySynthInternals {
  _voices: Array<{ dispose(): void }>;
  _availableVoices: Array<{ dispose(): void }>;
  _averageActiveVoices: number;
  activeVoices: number;
  _collectGarbage(): void;
  context: { isOffline: boolean };
}

/**
 * Tone's PolySynth garbage collector disposes idle voices roughly once a second, so a
 * looping pattern keeps destroying and re-allocating voices. Rebuilding a voice is
 * expensive (a fresh oscillator plus a periodic-wave lookup over the custom tonewheel
 * partials for every unison oscillator), and that allocation happens on the main thread
 * right when notes are being scheduled, which is what makes several tracks stutter.
 *
 * Retaining the voices turns the synth into a true voice pool: idle voices keep their
 * oscillators stopped (so they cost no audio CPU) and are simply re-triggered. The pool
 * is still bounded by `poolSize`, so voices above that watermark are collected as before.
 */
export function retainVoicePool(synth: Tone.PolySynth, poolSize = MAX_POOLED_VOICES): void {
  const internals = synth as unknown as PolySynthInternals;
  const boundedPoolSize = Math.max(1, Math.min(MAX_POOLED_VOICES, Math.round(poolSize)));

  internals._collectGarbage = function collectPooledGarbage(this: PolySynthInternals) {
    this._averageActiveVoices = Math.max(this._averageActiveVoices * 0.95, this.activeVoices);
    if (this._voices.length <= boundedPoolSize || this._availableVoices.length === 0) {
      return;
    }

    const firstAvailable = this._availableVoices.shift();
    if (!firstAvailable) {
      return;
    }
    const index = this._voices.indexOf(firstAvailable);
    if (index >= 0) {
      this._voices.splice(index, 1);
    }
    if (!this.context.isOffline) {
      firstAvailable.dispose();
    }
  };
}
