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
  /** Number of bars to wait before the track starts (0-64). */
  delay?: number;
  /** Number of repetitions of the pattern (1-64). */
  repeats?: number;
  attack?: number;
  release?: number;
  unisonVoices?: number;
  unisonDetune?: number;
  tremoloEnabled?: boolean;
  tremoloFrequency?: number;
  tremoloDepth?: number;
  vibratoEnabled?: boolean;
  vibratoFrequency?: number;
  vibratoDepth?: number;
  filterEnabled?: boolean;
  filterType?: string;
  filterFrequency?: number;
  filterQ?: number;
  filterGain?: number;
  filterKeyFollow?: number;
  echoEnabled?: boolean;
  echoDelay?: number;
  echoFeedback?: number;
  echoWet?: number;
  echoPingPong?: boolean;
  reverbWet?: number;
}

export interface GenerateReverbOptions {
  enabled?: boolean;
  decay?: number;
  preDelay?: number;
  wet?: number;
  lowCut?: number;
  highCut?: number;
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
  /** Legacy single-track delay in bars used when tracks is omitted. */
  delay?: number;
  /** Legacy single-track number of pattern repetitions used when tracks is omitted. */
  repeats?: number;
  /** Multi-track definition. If omitted, legacy single-track fields are used. */
  tracks?: GenerateTrackOptions[];
  reverb?: GenerateReverbOptions;
}

let pcs12Initialized = false;

type NormalizedTrack = Required<GenerateTrackOptions>;
type NormalizedReverb = Required<GenerateReverbOptions>;

interface TrackRenderData {
  track: NormalizedTrack;
  quant: number;
  actualNotes: number[][];
}

interface PreparedRenderData {
  bpm: number;
  tracks: TrackRenderData[];
  reverb: NormalizedReverb;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function getLoopDurationSecondsFromTrackLengths(prepared: PreparedRenderData): number {
  const entries = prepared.tracks.filter((entry) => entry.actualNotes.length > 0);
  if (entries.length === 0) {
    return 1;
  }

  const maxDuration = Math.max(
    ...entries.map((entry) => getTrackDelaySeconds(prepared.bpm, entry.track) + entry.track.repeats * entry.actualNotes.length * entry.quant),
  );

  return Math.max(entries[0].quant, maxDuration);
}

function getTrackDelaySeconds(bpm: number, track: NormalizedTrack): number {
  return track.delay * track.numerator * (60 / bpm);
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
    delay: clamp(options.delay ?? 0, 0, 64),
    repeats: clamp(options.repeats ?? 1, 1, 64),
    attack: 0.01,
    release: 0.12,
    unisonVoices: 1,
    unisonDetune: 12,
    tremoloEnabled: false,
    tremoloFrequency: 5,
    tremoloDepth: 0.35,
    vibratoEnabled: false,
    vibratoFrequency: 5,
    vibratoDepth: 0.08,
    filterEnabled: false,
    filterType: 'lowpass',
    filterFrequency: 12000,
    filterQ: 1,
    filterGain: 0,
    filterKeyFollow: 0,
    echoEnabled: false,
    echoDelay: 0.25,
    echoFeedback: 0.25,
    echoWet: 0.25,
    echoPingPong: true,
    reverbWet: 0.2,
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
    delay: clamp(track.delay ?? fallbackTrack.delay, 0, 64),
    repeats: clamp(track.repeats ?? fallbackTrack.repeats, 1, 64),
    attack: clamp(track.attack ?? fallbackTrack.attack, 0, 10),
    release: clamp(track.release ?? fallbackTrack.release, 0, 20),
    unisonVoices: clamp(track.unisonVoices ?? fallbackTrack.unisonVoices, 1, 8),
    unisonDetune: clamp(track.unisonDetune ?? fallbackTrack.unisonDetune, 0, 100),
    tremoloEnabled: Boolean(track.tremoloEnabled ?? fallbackTrack.tremoloEnabled),
    tremoloFrequency: clamp(track.tremoloFrequency ?? fallbackTrack.tremoloFrequency, 0.01, 40),
    tremoloDepth: clamp(track.tremoloDepth ?? fallbackTrack.tremoloDepth, 0, 1),
    vibratoEnabled: Boolean(track.vibratoEnabled ?? fallbackTrack.vibratoEnabled),
    vibratoFrequency: clamp(track.vibratoFrequency ?? fallbackTrack.vibratoFrequency, 0.01, 40),
    vibratoDepth: clamp(track.vibratoDepth ?? fallbackTrack.vibratoDepth, 0, 1),
    filterEnabled: Boolean(track.filterEnabled ?? fallbackTrack.filterEnabled),
    filterType: track.filterType ?? fallbackTrack.filterType,
    filterFrequency: clamp(track.filterFrequency ?? fallbackTrack.filterFrequency, 20, 20000),
    filterQ: clamp(track.filterQ ?? fallbackTrack.filterQ, 0.0001, 30),
    filterGain: clamp(track.filterGain ?? fallbackTrack.filterGain, -48, 48),
    filterKeyFollow: clamp(track.filterKeyFollow ?? fallbackTrack.filterKeyFollow, -200, 200),
    echoEnabled: Boolean(track.echoEnabled ?? fallbackTrack.echoEnabled),
    echoDelay: clamp(track.echoDelay ?? fallbackTrack.echoDelay, 0.01, 4),
    echoFeedback: clamp(track.echoFeedback ?? fallbackTrack.echoFeedback, 0, 0.95),
    echoWet: clamp(track.echoWet ?? fallbackTrack.echoWet, 0, 1),
    echoPingPong: Boolean(track.echoPingPong ?? fallbackTrack.echoPingPong),
    reverbWet: clamp(track.reverbWet ?? fallbackTrack.reverbWet, 0, 1),
  }));
}

function normalizeReverb(options: GenerateOptions): NormalizedReverb {
  const reverb = options.reverb ?? {};
  return {
    enabled: Boolean(reverb.enabled ?? true),
    decay: clamp(reverb.decay ?? 3, 0.1, 30),
    preDelay: clamp(reverb.preDelay ?? 0.02, 0, 1),
    wet: clamp(reverb.wet ?? 0.45, 0, 1),
    lowCut: clamp(reverb.lowCut ?? 120, 20, 20000),
    highCut: clamp(reverb.highCut ?? 12000, 20, 20000),
  };
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
    reverb: normalizeReverb(options),
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

function getRenderTrailSeconds(prepared: PreparedRenderData): number {
  const releaseTrail = Math.max(0, ...prepared.tracks.map((entry) => entry.track.release));
  const echoTrail = Math.max(
    0,
    ...prepared.tracks.map((entry) => entry.track.echoEnabled ? entry.track.echoDelay * (1 + entry.track.echoFeedback * 8) : 0),
  );
  const reverbTrail = prepared.reverb.enabled ? prepared.reverb.preDelay + prepared.reverb.decay : 0;
  return Math.max(2, releaseTrail, echoTrail, reverbTrail);
}

function getFilterFrequency(track: NormalizedTrack, midiNotes: number[]): number {
  if (!track.filterEnabled || midiNotes.length === 0 || track.filterKeyFollow === 0) {
    return track.filterFrequency;
  }
  const averageMidi = midiNotes.reduce((sum, note) => sum + note, 0) / midiNotes.length;
  const noteFrequency = 440 * Math.pow(2, (averageMidi - 69) / 12);
  return clamp(track.filterFrequency * Math.pow(noteFrequency / 440, track.filterKeyFollow / 100), 20, 20000);
}

function applySimpleFilter(sample: number, state: { low: number; high: number; band: number }, track: NormalizedTrack, cutoff: number, sampleRate: number): number {
  if (!track.filterEnabled) {
    return sample;
  }

  const frequency = clamp(cutoff, 20, sampleRate / 2 - 100);
  const f = 2 * Math.sin(Math.PI * frequency / sampleRate);
  const q = Math.max(0.05, track.filterQ);
  state.low += f * state.band;
  state.high = sample - state.low - q * state.band;
  state.band += f * state.high;

  switch (track.filterType) {
    case 'highpass':
      return state.high;
    case 'bandpass':
      return state.band;
    case 'notch':
      return state.low + state.high;
    case 'peaking':
      return sample + state.band * (Math.pow(10, track.filterGain / 20) - 1);
    case 'lowshelf':
      return sample + state.low * (Math.pow(10, track.filterGain / 20) - 1);
    case 'highshelf':
      return sample + state.high * (Math.pow(10, track.filterGain / 20) - 1);
    case 'allpass':
      return sample;
    case 'lowpass':
    default:
      return state.low;
  }
}

function applyFeedbackEcho(left: Float32Array, right: Float32Array, track: NormalizedTrack, sampleRate: number): void {
  if (!track.echoEnabled || track.echoWet <= 0) {
    return;
  }

  const delayFrames = Math.max(1, Math.round(track.echoDelay * sampleRate));
  for (let frame = delayFrames; frame < left.length; frame += 1) {
    const echoLeft = (track.echoPingPong ? right[frame - delayFrames] : left[frame - delayFrames]) * track.echoFeedback;
    const echoRight = (track.echoPingPong ? left[frame - delayFrames] : right[frame - delayFrames]) * track.echoFeedback;
    left[frame] += echoLeft * track.echoWet;
    right[frame] += echoRight * track.echoWet;
  }
}

function applyReverbSend(left: Float32Array, right: Float32Array, sendLeft: Float32Array, sendRight: Float32Array, reverb: NormalizedReverb, sampleRate: number): void {
  if (!reverb.enabled || reverb.wet <= 0) {
    return;
  }

  const preDelayFrames = Math.round(reverb.preDelay * sampleRate);
  const decayFrames = Math.max(1, Math.round(reverb.decay * sampleRate));
  const taps = [0.029, 0.037, 0.041, 0.053, 0.071, 0.089, 0.113, 0.137];
  for (let frame = 0; frame < left.length; frame += 1) {
    let wetLeft = 0;
    let wetRight = 0;
    for (let tapIndex = 0; tapIndex < taps.length; tapIndex += 1) {
      const tapFrames = preDelayFrames + Math.round(taps[tapIndex] * sampleRate);
      const sourceFrame = frame - tapFrames;
      if (sourceFrame < 0) {
        continue;
      }

      const envelope = Math.exp(-tapFrames / decayFrames);
      const pan = tapIndex % 2 === 0 ? 0.65 : 0.35;
      wetLeft += (sendLeft[sourceFrame] * pan + sendRight[sourceFrame] * (1 - pan)) * envelope;
      wetRight += (sendRight[sourceFrame] * pan + sendLeft[sourceFrame] * (1 - pan)) * envelope;
    }
    left[frame] += wetLeft * reverb.wet;
    right[frame] += wetRight * reverb.wet;
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
  const totalLoopDuration = getLoopDurationSecondsFromTrackLengths(prepared);

  for (const entry of prepared.tracks) {
    if (entry.actualNotes.length === 0) {
      continue;
    }

    const track = midi.addTrack();
    track.channel = entry.track.midiChannel - 1;
    const trackPeriod = entry.actualNotes.length * entry.quant;
    if (trackPeriod <= 0) {
      continue;
    }

    const delaySeconds = getTrackDelaySeconds(prepared.bpm, entry.track);

    for (let repeat = 0; repeat < entry.track.repeats; repeat += 1) {
      const loopStart = delaySeconds + repeat * trackPeriod;
      for (let i = 0; i < entry.actualNotes.length; i += 1) {
        const notes = entry.actualNotes[i];
        if (notes.length === 0) {
          continue;
        }

        const eventTime = loopStart + (i * entry.quant);
        if (eventTime >= totalLoopDuration) {
          continue;
        }

        const vel = Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * entry.track.gain);
        const dur = getStepDuration(entry.actualNotes, i);

        for (const note of notes) {
          track.addNote({
            midi: note,
            time: eventTime,
            duration: (dur * entry.quant * entry.track.lengthFactor) / 100.0,
            velocity: vel,
          });
        }
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
  const totalDuration = getLoopDurationSecondsFromTrackLengths(prepared);
  const renderDuration = totalDuration + getRenderTrailSeconds(prepared);

  const frameCount = Math.ceil(renderDuration * sampleRate);
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);
  const reverbLeft = new Float32Array(frameCount);
  const reverbRight = new Float32Array(frameCount);

  for (const entry of prepared.tracks) {
    if (entry.actualNotes.length === 0) {
      continue;
    }

    const trackPeriod = entry.actualNotes.length * entry.quant;
    if (trackPeriod <= 0) {
      continue;
    }

    const delaySeconds = getTrackDelaySeconds(prepared.bpm, entry.track);
    const trackLeft = new Float32Array(frameCount);
    const trackRight = new Float32Array(frameCount);

    for (let repeat = 0; repeat < entry.track.repeats; repeat += 1) {
      const loopStart = delaySeconds + repeat * trackPeriod;
      for (let i = 0; i < entry.actualNotes.length; i += 1) {
        const notes = entry.actualNotes[i];
        if (notes.length === 0) {
          continue;
        }

        const start = loopStart + (i * entry.quant);
        if (start >= totalDuration) {
          continue;
        }

        const durSteps = getStepDuration(entry.actualNotes, i);
        const duration = (durSteps * entry.quant * entry.track.lengthFactor) / 100.0;
        const velocity = Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * entry.track.gain);
        const noteAmplitude = velocity * 0.12;
        const filterCutoff = getFilterFrequency(entry.track, notes);

        const startFrame = Math.max(0, Math.floor(start * sampleRate));
        const endFrame = Math.min(frameCount, Math.ceil((start + duration + entry.track.release) * sampleRate));

        for (const midiNote of notes) {
          const voiceCount = entry.track.unisonVoices;

          for (let voice = 0; voice < voiceCount; voice += 1) {
            const detuneOffset = voiceCount === 1 ? 0 : ((voice / (voiceCount - 1)) - 0.5) * entry.track.unisonDetune;
            const frequency = 440 * Math.pow(2, (midiNote - 69 + detuneOffset / 100) / 12);
            const phaseIncrement = frequency / sampleRate;
            const voicePan = voiceCount === 1 ? 0.5 : voice / (voiceCount - 1);
            const filterState = { low: 0, high: 0, band: 0 };
            let phase = 0;

            for (let frame = startFrame; frame < endFrame; frame += 1) {
              const t = (frame - startFrame) / sampleRate;
              const releaseTime = duration - t;

              let env = 1;
              if (entry.track.attack > 0 && t < entry.track.attack) {
                env = t / entry.track.attack;
              }
              if (releaseTime < entry.track.release) {
                env = Math.min(env, Math.max(0, (releaseTime + entry.track.release) / Math.max(entry.track.release, 0.001)));
              }
              if (t > duration + entry.track.release) {
                env = 0;
              }

              const tremolo = entry.track.tremoloEnabled
                ? 1 - entry.track.tremoloDepth * (0.5 + 0.5 * Math.sin(2 * Math.PI * entry.track.tremoloFrequency * t))
                : 1;
              const vibrato = entry.track.vibratoEnabled
                ? Math.pow(2, Math.sin(2 * Math.PI * entry.track.vibratoFrequency * t) * entry.track.vibratoDepth / 12)
                : 1;
              const sample = applySimpleFilter(
                sampleOscillator(phase, entry.track.waveform) * noteAmplitude * env * tremolo / Math.sqrt(voiceCount),
                filterState,
                entry.track,
                filterCutoff,
                sampleRate,
              );
              trackLeft[frame] += sample * Math.cos(voicePan * Math.PI / 2);
              trackRight[frame] += sample * Math.sin(voicePan * Math.PI / 2);

              phase += phaseIncrement * vibrato;
              if (phase >= 1) {
                phase -= Math.floor(phase);
              }
            }
          }
        }
      }
    }

    applyFeedbackEcho(trackLeft, trackRight, entry.track, sampleRate);
    for (let frame = 0; frame < frameCount; frame += 1) {
      left[frame] += trackLeft[frame];
      right[frame] += trackRight[frame];
      reverbLeft[frame] += trackLeft[frame] * entry.track.reverbWet;
      reverbRight[frame] += trackRight[frame] * entry.track.reverbWet;
    }
  }

  applyReverbSend(left, right, reverbLeft, reverbRight, prepared.reverb, sampleRate);

  for (let i = 0; i < frameCount; i += 1) {
    left[i] = clamp(left[i], -1, 1);
    right[i] = clamp(right[i], -1, 1);
  }

  return encodeWavFromChannels([left, right], sampleRate);
}
