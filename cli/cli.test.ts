import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ToneMidi from '@tonejs/midi';
import { generateMidi, generateWav } from './generate.js';
import { DEFAULT_FM_SETTINGS } from '../src/audio/fourOperatorFmSynth.js';
import { DEFAULT_VIRTUAL_ANALOG_SETTINGS } from '../src/audio/virtualAnalogSynth.js';

const { Midi } = ToneMidi;

test('cli accepts a preset JSON file and writes output', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gaterunner-cli-'));
  const presetPath = join(tempDir, 'preset.json');
  const outputPath = join(tempDir, 'output.mid');

  const presetPayload = {
    version: 2,
    kind: 'single-preset',
    exportedAt: new Date(0).toISOString(),
    preset: {
      id: 'preset-1',
      name: 'Test preset',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      folderId: null,
      data: {
        bpm: 120,
        a4: 440,
        forte: '5-35.05',
        tracks: [
          {
            id: 'track-1',
            name: 'Track 1',
            numerator: 4,
            denominator: 4,
            phase: 0,
            waveform: 'sine',
            sequenceInput: '1 2 4 8',
            octave: 4,
            lengthFactor: 100,
            lengthOffset: 0,
            midiChannel: 1,
            gain: -6,
            velocityMultiplier: 1,
            delay: 0,
            repeats: 1,
            timeWarpEnabled: false,
            timeWarpCurve: 'linear',
            timeWarpExpression: '',
            timeWarpRepeats: 1,
            timeWarpAmount: 100,
            timeWarpQuantize: 0,
            timeWarpNoteLengths: true,
            attack: 0.01,
            decay: 0,
            sustain: 1,
            release: 0.12,
          },
        ],
        reverb: {
          enabled: true,
          decay: 8,
          preDelay: 0.04,
          dry: 0,
          wet: -2,
          lowCut: 39,
          highCut: 112,
        },
      },
    },
  };

  writeFileSync(presetPath, JSON.stringify(presetPayload, null, 2), 'utf8');

  try {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'cli/cli.ts', '--output', outputPath, '--preset', presetPath],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0, `Expected CLI to succeed, got status ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    assert.ok(existsSync(outputPath), 'Expected output MIDI file to be written');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('cli honors song-level bitmask sequence B with note clipping', async () => {
  // Two tracks, one step each, 1s step at 60 BPM / denominator 1.
  // Loop = 2s (two repeats). B = "1 2" activates track 0 then track 1 for 1s each.
  // Track 0 starts a long note in chunk 0 and must clip at the chunk boundary.
  const midiBytes = await generateMidi({
    bpm: 60,
    a4: 440,
    forte: '5-35.05',
    bitmaskSequenceInput: '1 2',
    tracks: [
      {
        name: 'Track A',
        numerator: 4,
        denominator: 1,
        sequence: '1',
        octave: 4,
        lengthFactor: 400,
        lengthOffset: 0,
        midiChannel: 1,
        delay: 0,
        repeats: 2,
        timeWarpEnabled: false,
      },
      {
        name: 'Track B',
        numerator: 4,
        denominator: 1,
        sequence: '1',
        octave: 5,
        lengthFactor: 100,
        lengthOffset: 0,
        midiChannel: 2,
        delay: 0,
        repeats: 2,
        timeWarpEnabled: false,
      },
    ],
  });

  const midi = new Midi(midiBytes);
  assert.equal(midi.tracks.length, 2);

  const trackANotes = midi.tracks[0].notes;
  const trackBNotes = midi.tracks[1].notes;

  // Track A active only in chunk 0 (first second). One onset at t=0, clipped to 1s.
  assert.equal(trackANotes.length, 1);
  assert.ok(Math.abs(trackANotes[0].time - 0) < 1e-6);
  assert.ok(Math.abs(trackANotes[0].duration - 1) < 1e-6);

  // Track B active only in chunk 1. One onset at t=1 (second repeat).
  assert.equal(trackBNotes.length, 1);
  assert.ok(Math.abs(trackBNotes[0].time - 1) < 1e-6);
  assert.ok(trackBNotes[0].duration > 0);
});

test('cli --preset JSON carries bitmaskSequenceInput into MIDI output', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'gaterunner-cli-b-'));
  const presetPath = join(tempDir, 'preset.json');
  const outputPath = join(tempDir, 'output.mid');

  const presetPayload = {
    version: 2,
    kind: 'single-preset',
    exportedAt: new Date(0).toISOString(),
    preset: {
      id: 'preset-b',
      name: 'Bitmask preset',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      folderId: null,
      data: {
        bpm: 60,
        a4: 440,
        forte: '5-35.05',
        bitmaskSequenceInput: '1 0',
        tracks: [
          {
            id: 'track-1',
            name: 'Track 1',
            numerator: 4,
            denominator: 1,
            phase: 0,
            waveform: 'sine',
            sequenceInput: '1',
            octave: 4,
            lengthFactor: 100,
            lengthOffset: 0,
            midiChannel: 1,
            gain: -6,
            velocityMultiplier: 1,
            delay: 0,
            repeats: 2,
            timeWarpEnabled: false,
            timeWarpCurve: 'linear',
            timeWarpExpression: '',
            timeWarpRepeats: 1,
            timeWarpAmount: 100,
            timeWarpQuantize: 0,
            timeWarpNoteLengths: true,
            attack: 0.01,
            decay: 0,
            sustain: 1,
            release: 0.12,
          },
        ],
        reverb: {
          enabled: false,
          decay: 8,
          preDelay: 0.04,
          dry: 0,
          wet: -2,
          lowCut: 39,
          highCut: 112,
        },
      },
    },
  };

  writeFileSync(presetPath, JSON.stringify(presetPayload, null, 2), 'utf8');

  try {
    const result = spawnSync(
      process.execPath,
      ['--import', 'tsx', 'cli/cli.ts', '--output', outputPath, '--preset', presetPath],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );

    assert.equal(result.status, 0, `Expected CLI to succeed, got status ${result.status}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`);
    assert.ok(existsSync(outputPath), 'Expected output MIDI file to be written');

    const midi = new Midi(readFileSync(outputPath));
    assert.equal(midi.tracks.length, 1);
    // Only the first of two repeats is active under B="1 0".
    assert.equal(midi.tracks[0].notes.length, 1);
    assert.ok(Math.abs(midi.tracks[0].notes[0].time - 0) < 1e-6);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('rhythmic tracks export GM notes with BigInt-safe per-lane velocities', async () => {
  const midiBytes = await generateMidi({
    bpm: 60,
    forte: '5-35.05',
    tracks: [{
      name: 'GM Kit',
      trackKind: 'rhythmic',
      drumLanes: [
        { voiceId: 'kick', parameters: {}, xorGroup: 0 },
        { voiceId: 'snare', parameters: {}, xorGroup: 0 },
        { voiceId: 'hat', parameters: {}, xorGroup: 0 },
      ],
      drumVelocityBits: 2,
      numerator: 1,
      denominator: 1,
      sequence: '1 4 16 5 18446744073709551617',
      lengthFactor: 100,
      lengthOffset: 0,
      midiChannel: 10,
      repeats: 1,
      delay: 0,
      timeWarpEnabled: false,
    }],
  });

  const midi = new Midi(midiBytes);
  assert.equal(midi.tracks.length, 1);
  assert.equal(midi.tracks[0].channel, 9);
  assert.deepEqual(midi.tracks[0].notes.map((note) => note.midi), [36, 38, 42, 36, 38, 36]);
  assert.deepEqual(midi.tracks[0].notes.slice(0, 3).map((note) => Number(note.velocity.toFixed(6))), [42 / 127, 42 / 127, 42 / 127].map((velocity) => Number(velocity.toFixed(6))));
});

test('track padding silences repeat with each sequence after the one-time delay', async () => {
  const midiBytes = await generateMidi({
    bpm: 60,
    tracks: [{
      numerator: 1,
      denominator: 1,
      sequence: '1 2',
      octave: 5,
      delay: 1,
      paddingBefore: 0.5,
      paddingAfter: 0.25,
      repeats: 2,
    }],
  });

  const midi = new Midi(midiBytes);
  assert.deepEqual(
    midi.tracks[0].notes.map((note) => Number(note.time.toFixed(6))),
    [1.5, 2.5, 4.25, 5.25],
  );
});

test('rhythmic tracks render synthesized audio in CLI WAV output', async () => {
  const wavBytes = await generateWav({
    bpm: 60,
    tracks: [{
      name: 'WAV Kit',
      trackKind: 'rhythmic',
      drumLanes: [{ voiceId: 'kick', parameters: { tune: 55, decay: 0.25 }, xorGroup: 0 }],
      drumVelocityBits: 1,
      numerator: 1,
      denominator: 1,
      sequence: '1',
      lengthFactor: 100,
      lengthOffset: 0,
      midiChannel: 10,
      repeats: 1,
      delay: 0,
      timeWarpEnabled: false,
    }],
    reverb: { enabled: false },
  });

  assert.equal(Buffer.from(wavBytes.subarray(0, 4)).toString('ascii'), 'RIFF');
  assert.ok(wavBytes.length > 44);
  assert.ok(wavBytes.subarray(44).some((value) => value !== 0));
});

test('CLI WAV output applies per-track fade in and fade out in bars', async () => {
  const wavBytes = await generateWav({
    bpm: 60,
    tracks: [{
      numerator: 1,
      denominator: 1,
      sequence: '1 1',
      octave: 5,
      lengthFactor: 100,
      repeats: 1,
      fadeIn: 0.5,
      fadeOut: 0.5,
    }],
    reverb: { enabled: false },
  });

  const pcm = new DataView(wavBytes.buffer, wavBytes.byteOffset + 44, wavBytes.byteLength - 44);
  const averageAmplitude = (startSeconds: number, endSeconds: number): number => {
    const startOffset = Math.floor(startSeconds * 48000) * 6;
    const endOffset = Math.min(pcm.byteLength, Math.floor(endSeconds * 48000) * 6);
    let total = 0;
    let samples = 0;
    for (let offset = startOffset; offset + 2 < endOffset; offset += 6) {
      const raw = pcm.getUint8(offset) | (pcm.getUint8(offset + 1) << 8) | (pcm.getUint8(offset + 2) << 16);
      total += Math.abs((raw & 0x800000) !== 0 ? raw - 0x1000000 : raw);
      samples += 1;
    }
    return total / samples;
  };

  const fadeInAmplitude = averageAmplitude(0.05, 0.15);
  const middleAmplitude = averageAmplitude(0.8, 1.2);
  const fadeOutAmplitude = averageAmplitude(1.85, 1.95);
  assert.ok(middleAmplitude > fadeInAmplitude * 3, `${middleAmplitude} should exceed fade-in amplitude ${fadeInAmplitude}`);
  assert.ok(middleAmplitude > fadeOutAmplitude * 3, `${middleAmplitude} should exceed fade-out amplitude ${fadeOutAmplitude}`);
});

test('four-operator FM tracks render audible audio in CLI WAV output', async () => {
  const wavBytes = await generateWav({
    bpm: 120,
    tracks: [{
      name: 'FM Bell',
      trackKind: 'melodic',
      generatorType: 'fm',
      fmSynth: {
        ...DEFAULT_FM_SETTINGS,
        algorithm: 4,
        modulationIndex: 7.5,
        feedback: 0.2,
        operators: DEFAULT_FM_SETTINGS.operators.map((operator, index) => ({
          ...operator,
          ratio: [1, 2, 3, 7][index],
          sustain: index === 0 ? 0.8 : 0.1,
        })),
      },
      numerator: 1,
      denominator: 4,
      sequence: '1',
      octave: 5,
      lengthFactor: 100,
      lengthOffset: 0,
      midiChannel: 1,
      repeats: 1,
      delay: 0,
      timeWarpEnabled: false,
    }],
    reverb: { enabled: false },
  });

  assert.equal(Buffer.from(wavBytes.subarray(0, 4)).toString('ascii'), 'RIFF');
  const pcm = new DataView(wavBytes.buffer, wavBytes.byteOffset + 44, wavBytes.byteLength - 44);
  let peak = 0;
  for (let offset = 0; offset + 1 < pcm.byteLength; offset += 2) {
    peak = Math.max(peak, Math.abs(pcm.getInt16(offset, true)));
  }
  assert.ok(peak > 100, `expected audible FM output, got PCM peak ${peak}`);
});

test('virtual-analog tracks render audible deterministic stereo audio in CLI WAV output', async () => {
  const options = {
    bpm: 120,
    tracks: [{
      name: 'VA Stack',
      trackKind: 'melodic' as const,
      generatorType: 'virtual-analog' as const,
      virtualAnalogSynth: {
        ...DEFAULT_VIRTUAL_ANALOG_SETTINGS,
        oscillators: DEFAULT_VIRTUAL_ANALOG_SETTINGS.oscillators.map((oscillator, index) => ({
          ...oscillator,
          waveform: index === 2 ? 'pulse' as const : oscillator.waveform,
          unisonVoices: index < 2 ? 3 : 1,
          stereoSpread: index < 2 ? 0.8 : 0,
        })),
        ringMod: 0.2,
        sub: { ...DEFAULT_VIRTUAL_ANALOG_SETTINGS.sub, enabled: true, level: 0.25 },
        noise: { ...DEFAULT_VIRTUAL_ANALOG_SETTINGS.noise, enabled: true, level: 0.04 },
      },
      numerator: 1,
      denominator: 4,
      sequence: '1',
      octave: 5,
      lengthFactor: 100,
      lengthOffset: 0,
      midiChannel: 1,
      repeats: 1,
      delay: 0,
      timeWarpEnabled: false,
    }],
    reverb: { enabled: false },
  };
  const first = await generateWav(options);
  const second = await generateWav(options);

  assert.equal(Buffer.from(first.subarray(0, 4)).toString('ascii'), 'RIFF');
  assert.deepEqual(first, second, 'virtual-analog noise and drift rendering must be reproducible');
  const pcm = new DataView(first.buffer, first.byteOffset + 44, first.byteLength - 44);
  let peak = 0;
  for (let offset = 0; offset + 1 < pcm.byteLength; offset += 2) {
    peak = Math.max(peak, Math.abs(pcm.getInt16(offset, true)));
  }
  assert.ok(peak > 100, `expected audible virtual-analog output, got PCM peak ${peak}`);
});
