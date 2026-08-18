import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import ToneMidi from '@tonejs/midi';
import { generateMidi, generateWav } from './generate.js';

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
        { voiceId: 'kick', parameters: {} },
        { voiceId: 'snare', parameters: {} },
        { voiceId: 'hat', parameters: {} },
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

test('rhythmic tracks render synthesized audio in CLI WAV output', async () => {
  const wavBytes = await generateWav({
    bpm: 60,
    tracks: [{
      name: 'WAV Kit',
      trackKind: 'rhythmic',
      drumLanes: [{ voiceId: 'kick', parameters: { tune: 55, decay: 0.25 } }],
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
