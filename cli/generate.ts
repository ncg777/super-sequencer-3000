import ToneMidi from '@tonejs/midi';
const { Midi } = ToneMidi;
import { PCS12 } from 'ultra-mega-enumerator';

export interface GenerateTrackOptions {
  /** Optional display name for the track. */
  name?: string;
  /** Time signature numerator (1-16). Kept for parity with app presets. */
  numerator?: number;
  /** Time signature denominator (1-16). Controls this track quantization step size. */
  denominator?: number;
  /** Oscillator shape metadata (not used by MIDI export). */
  waveform?: string;
  /** Space-separated integers to encode as notes, e.g. "1 2 4 8 16". */
  sequence?: string;
  /** Octave shift (0-10). */
  octave?: number;
  /** Note length as percentage of quantization step (1-400). */
  lengthFactor?: number;
  /** MIDI channel (1-16). */
  midiChannel?: number;
  /** Velocity multiplier (0-4), clamped to 1 after velocity math. */
  gain?: number;
}

export interface GenerateOptions {
  /** Tempo in beats per minute (1-499). Default: 90 */
  bpm?: number;
  /** Legacy single-track numerator (1-16). Used when tracks is omitted. */
  numerator?: number;
  /** Legacy single-track denominator (1-16). Used when tracks is omitted. */
  denominator?: number;
  /** Forte number (pitch-class set identifier), e.g. "5-35.05". Default: "5-35.05" */
  forte?: string;
  /** Legacy single-track sequence used when tracks is omitted. */
  sequence?: string;
  /** Legacy single-track octave used when tracks is omitted. */
  octave?: number;
  /** Legacy single-track length factor used when tracks is omitted. */
  lengthFactor?: number;
  /** Legacy single-track midi channel used when tracks is omitted. */
  midiChannel?: number;
  /** Legacy single-track gain used when tracks is omitted. */
  gain?: number;
  /** Legacy single-track waveform metadata used when tracks is omitted. */
  waveform?: string;
  /** Multi-track definition. If omitted, legacy single-track fields are used. */
  tracks?: GenerateTrackOptions[];
}

let pcs12Initialized = false;

type NormalizedTrack = Required<GenerateTrackOptions>;

interface TrackRenderData {
  track: NormalizedTrack;
  quant: number;
  actualNotes: number[][];
}

interface PreparedRenderData {
  bpm: number;
  tracks: TrackRenderData[];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function parseSequence(sequenceInput: string): number[] {
  return sequenceInput
    .trim()
    .split(/\s+/)
    .map((n: string) => Number.parseInt(n.trim(), 10))
    .filter((n: number) => !Number.isNaN(n));
}

function getStepDuration(actualNotes: number[][], index: number): number {
  if (actualNotes.length === 0) {
    return 1;
  }

  for (let offset = 1; offset < actualNotes.length; offset += 1) {
    if (actualNotes[(index + offset) % actualNotes.length].length > 0) {
      return offset;
    }
  }

  return 1;
}

function normalizeTracks(options: GenerateOptions): Array<Required<GenerateTrackOptions>> {
  const fallbackTrack: Required<GenerateTrackOptions> = {
    name: 'Track 1',
    numerator: clamp(options.numerator ?? 4, 1, 16),
    denominator: clamp(options.denominator ?? 5, 1, 16),
    waveform: options.waveform ?? 'sine',
    sequence: options.sequence ?? '1 2 4 8 16',
    octave: clamp(options.octave ?? 6, 0, 10),
    lengthFactor: clamp(options.lengthFactor ?? 100, 1, 400),
    midiChannel: clamp(options.midiChannel ?? 1, 1, 16),
    gain: clamp(options.gain ?? 1, 0, 4),
  };

  const incoming = options.tracks;
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return [fallbackTrack];
  }

  return incoming.map((track, index) => ({
    name: track.name?.trim() ? track.name.trim() : `Track ${index + 1}`,
    numerator: clamp(track.numerator ?? fallbackTrack.numerator, 1, 16),
    denominator: clamp(track.denominator ?? fallbackTrack.denominator, 1, 16),
    waveform: track.waveform ?? fallbackTrack.waveform,
    sequence: track.sequence ?? fallbackTrack.sequence,
    octave: clamp(track.octave ?? fallbackTrack.octave, 0, 10),
    lengthFactor: clamp(track.lengthFactor ?? fallbackTrack.lengthFactor, 1, 400),
    midiChannel: clamp(track.midiChannel ?? clamp(index + 1, 1, 16), 1, 16),
    gain: clamp(track.gain ?? fallbackTrack.gain, 0, 4),
  }));
}

async function ensurePcs12Initialized(): Promise<void> {
  if (!pcs12Initialized) {
    await PCS12.init();
    pcs12Initialized = true;
  }
}

async function prepareRenderData(options: GenerateOptions): Promise<PreparedRenderData> {
  await ensurePcs12Initialized();

  const bpm = options.bpm ?? 90;
  const forte = options.forte ?? '5-35.05';
  const tracks = normalizeTracks(options);

  const pitchClassSet = PCS12.parseForte(forte);
  if (!pitchClassSet) {
    throw new Error(`Invalid Forte number: ${forte}`);
  }

  const pitches: number[] = pitchClassSet.asSequence() || [];
  const scale: number[] = [];

  for (const n of pitches) {
    for (let i = 0; i <= 10; i += 1) {
      const t = n + 12 * i;
      if (t < 128) {
        scale.push(t);
      }
    }
  }
  scale.sort((a, b) => a - b);

  const pitchClassCount: number = pitchClassSet.getK() ?? 0;
  const trackData: TrackRenderData[] = tracks.map((track) => {
    const sequence = parseSequence(track.sequence);
    const actualNotes: number[][] = sequence.map((n: number) => {
      const bits = Math.abs(n).toString(2).split('').reverse();
      const sign = Math.sign(n) || 1;
      return scale.filter((_: number, idx: number) => {
        const bitIndex = sign * (idx - track.octave * pitchClassCount);
        return bitIndex >= 0 && bitIndex < bits.length && bits[bitIndex] === '1';
      });
    });

    return {
      track,
      quant: 60.0 / (bpm * track.denominator),
      actualNotes,
    };
  });

  return {
    bpm,
    tracks: trackData,
  };
}

function sampleOscillator(phase: number, waveform: string): number {
  switch (waveform) {
    case 'square':
      return phase < 0.5 ? 1 : -1;
    case 'triangle':
      return 1 - 4 * Math.abs(phase - 0.5);
    case 'sawtooth':
      return 2 * phase - 1;
    case 'sine':
    default:
      return Math.sin(2 * Math.PI * phase);
  }
}

function encodeWavFromChannels(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  let offset = 0;
  const writeString = (value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset, value.charCodeAt(i));
      offset += 1;
    }
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + dataLength, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;
  writeString('data');
  view.setUint32(offset, dataLength, true);
  offset += 4;

  for (let i = 0; i < frameCount; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = clamp(channels[channel][i], -1, 1);
      const intSample = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7FFF);
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

/**
 * Generate a MIDI file from the given options.
 * Returns the raw MIDI bytes as a Uint8Array.
 */
export async function generateMidi(options: GenerateOptions): Promise<Uint8Array> {
  const prepared = await prepareRenderData(options);
  const hasNotes = prepared.tracks.some((entry) => entry.actualNotes.some((notes) => notes.length > 0));
  if (!hasNotes) {
    return new Midi().toArray();
  }

  const midi = new Midi();
  midi.header.setTempo(prepared.bpm);

  for (const entry of prepared.tracks) {
    if (entry.actualNotes.length === 0) {
      continue;
    }

    const track = midi.addTrack();
    track.channel = entry.track.midiChannel - 1;

    for (let i = 0; i < entry.actualNotes.length; i += 1) {
      const notes = entry.actualNotes[i];
      if (notes.length === 0) {
        continue;
      }

      const vel = Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * entry.track.gain);
      const dur = getStepDuration(entry.actualNotes, i);

      for (const note of notes) {
        track.addNote({
          midi: note,
          time: i * entry.quant,
          duration: (dur * entry.quant * entry.track.lengthFactor) / 100.0,
          velocity: vel,
        });
      }
    }
  }

  return midi.toArray();
}

/**
 * Render a WAV file from the given options.
 * Returns raw WAV bytes as a Uint8Array.
 */
export async function generateWav(options: GenerateOptions): Promise<Uint8Array> {
  const prepared = await prepareRenderData(options);
  const hasNotes = prepared.tracks.some((entry) => entry.actualNotes.some((notes) => notes.length > 0));
  if (!hasNotes) {
    return encodeWavFromChannels([new Float32Array(1), new Float32Array(1)], 44100);
  }

  const sampleRate = 44100;
  let totalDuration = 0;
  for (const entry of prepared.tracks) {
    let trackMaxEnd = 0;
    for (let i = 0; i < entry.actualNotes.length; i += 1) {
      const notes = entry.actualNotes[i];
      if (notes.length === 0) {
        continue;
      }

      const durSteps = getStepDuration(entry.actualNotes, i);
      const duration = (durSteps * entry.quant * entry.track.lengthFactor) / 100.0;
      const end = i * entry.quant + duration;
      if (end > trackMaxEnd) {
        trackMaxEnd = end;
      }
    }
    if (trackMaxEnd > totalDuration) {
      totalDuration = trackMaxEnd;
    }
  }
  totalDuration = Math.max(1, totalDuration + 0.25);

  const frameCount = Math.ceil(totalDuration * sampleRate);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);

  const attackSeconds = 0.005;
  const releaseSeconds = 0.03;

  for (const entry of prepared.tracks) {
    for (let i = 0; i < entry.actualNotes.length; i += 1) {
      const notes = entry.actualNotes[i];
      if (notes.length === 0) {
        continue;
      }

      const start = i * entry.quant;
      const durSteps = getStepDuration(entry.actualNotes, i);
      const duration = (durSteps * entry.quant * entry.track.lengthFactor) / 100.0;
      const velocity = Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * entry.track.gain);
      const noteAmplitude = velocity * 0.18;

      const startFrame = Math.max(0, Math.floor(start * sampleRate));
      const endFrame = Math.min(frameCount, Math.ceil((start + duration) * sampleRate));

      for (const midiNote of notes) {
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        const phaseIncrement = frequency / sampleRate;
        let phase = 0;

        for (let frame = startFrame; frame < endFrame; frame += 1) {
          const t = (frame - startFrame) / sampleRate;
          const releaseTime = duration - t;

          let env = 1;
          if (t < attackSeconds) {
            env = t / attackSeconds;
          }
          if (releaseTime < releaseSeconds) {
            env = Math.min(env, Math.max(0, releaseTime / releaseSeconds));
          }

          const sample = sampleOscillator(phase, entry.track.waveform) * noteAmplitude * env;
          left[frame] += sample;
          right[frame] += sample;

          phase += phaseIncrement;
          if (phase >= 1) {
            phase -= Math.floor(phase);
          }
        }
      }
    }
  }

  for (let i = 0; i < frameCount; i += 1) {
    left[i] = clamp(left[i], -1, 1);
    right[i] = clamp(right[i], -1, 1);
  }

  return encodeWavFromChannels([left, right], sampleRate);
}
