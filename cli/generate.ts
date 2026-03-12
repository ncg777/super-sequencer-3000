import ToneMidi from '@tonejs/midi';
const { Midi } = ToneMidi;
import { PCS12 } from 'ultra-mega-enumerator';

export interface GenerateOptions {
  /** Tempo in beats per minute (1-499). Default: 90 */
  bpm?: number;
  /** Time signature numerator (1-16). Note: has no effect on MIDI generation. Default: 4 */
  numerator?: number;
  /** Time signature denominator (1-16). Controls quantization step size. Default: 5 */
  denominator?: number;
  /** Forte number (pitch-class set identifier), e.g. "5-35.05". Default: "5-35.05" */
  forte?: string;
  /** Space-separated integers to encode as notes, e.g. "1 2 4 8 16". Default: "1 2 4 8 16" */
  sequence?: string;
  /** Octave shift (0-10). Default: 6 */
  octave?: number;
  /** Note length as percentage of quantization step (1-400). Default: 100 */
  lengthFactor?: number;
}

let pcs12Initialized = false;

/**
 * Generate a MIDI file from the given options.
 * Returns the raw MIDI bytes as a Uint8Array.
 */
export async function generateMidi(options: GenerateOptions): Promise<Uint8Array> {
  if (!pcs12Initialized) {
    await PCS12.init();
    pcs12Initialized = true;
  }

  const bpm = options.bpm ?? 90;
  const denominator = options.denominator ?? 5;
  const forte = options.forte ?? '5-35.05';
  const sequenceInput = options.sequence ?? '1 2 4 8 16';
  const octave = options.octave ?? 6;
  const lengthFactor = options.lengthFactor ?? 100;

  const quant = 60.0 / (bpm * denominator);

  const sequence: number[] = sequenceInput
    .split(' ')
    .map((n: string) => parseInt(n.trim()))
    .filter((n: number) => !isNaN(n));

  const pitchClassSet = PCS12.parseForte(forte);
  if (!pitchClassSet) throw new Error(`Invalid Forte number: ${forte}`);

  const pitches: number[] = pitchClassSet.asSequence() || [];
  const scale: number[] = [];

  for (const n of pitches) {
    for (let i = 0; i <= 10; i++) {
      const t = n + 12 * i;
      if (t < 128) scale.push(t);
    }
  }
  scale.sort((a, b) => a - b);

  const pitchClassCount: number = pitchClassSet.getK() ?? 0;

  const actualNotes: number[][] = sequence.map((n: number) => {
    const bits = Math.abs(n).toString(2).split('').reverse();
    const sign = Math.sign(n);
    return scale.filter((_: number, idx: number) => {
      const bitIndex = sign * (idx - octave * pitchClassCount);
      return bitIndex >= 0 && bitIndex < bits.length && bits[bitIndex] === '1';
    });
  });

  const hasNotes = actualNotes.some((notes) => notes.length > 0);
  if (!hasNotes) {
    return new Midi().toArray();
  }

  const midi = new Midi();
  const track = midi.addTrack();
  track.channel = 0;
  midi.header.setTempo(bpm);

  for (let i = 0; i < actualNotes.length; i++) {
    const notes = actualNotes[i];
    if (notes.length === 0) continue;

    const vel = 0.5 * Math.sqrt(1.0 / notes.length);

    let dur = 1;
    while (actualNotes[(i + dur) % actualNotes.length].length === 0) dur++;

    for (const note of notes) {
      track.addNote({
        midi: note,
        time: i * quant,
        duration: (dur * quant * lengthFactor) / 100.0,
        velocity: vel,
      });
    }
  }

  return midi.toArray();
}
