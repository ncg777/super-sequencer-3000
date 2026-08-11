import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

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
