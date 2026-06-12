#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { generateMidi, type GenerateTrackOptions } from './generate.js';

const program = new Command();

function parseTracksJson(value: string): GenerateTrackOptions[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('tracks must be a JSON array');
    }
    return parsed as GenerateTrackOptions[];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid --tracks JSON: ${message}`);
  }
}

program
  .name('gaterunner')
  .description('Generate a MIDI file from a GateRunner sequence')
  .version('1.0.0')
  .requiredOption('-o, --output <file>', 'Output MIDI file path')
  .option('--bpm <number>', 'Shared tempo in beats per minute (1-499)', '90')
  .option('--numerator <number>', 'Legacy single-track numerator (1-16)', '4')
  .option('--denominator <number>', 'Legacy single-track denominator (1-16)', '5')
  .option('--forte <string>', 'Forte number (pitch-class set identifier)', '5-35.05')
  .option('--sequence <string>', 'Legacy single-track sequence', '1 2 4 8 16')
  .option('--octave <number>', 'Legacy single-track octave (0-10)', '6')
  .option('--length-factor <number>', 'Legacy single-track note length percent (1-400)', '100')
  .option('--midi-channel <number>', 'Legacy single-track MIDI channel (1-16)', '1')
  .option('--gain <number>', 'Legacy single-track gain multiplier (0-4)', '1')
  .option('--waveform <string>', 'Legacy single-track waveform metadata', 'sine')
  .option('--tracks <json>', 'JSON array of tracks with per-track numerator, denominator, sequence, octave, lengthFactor, midiChannel, gain, waveform', parseTracksJson)
  .action(async (options) => {
    try {
      const data = await generateMidi({
        bpm: parseInt(options.bpm),
        numerator: parseInt(options.numerator),
        denominator: parseInt(options.denominator),
        forte: options.forte,
        sequence: options.sequence,
        octave: parseInt(options.octave),
        lengthFactor: parseInt(options.lengthFactor),
        midiChannel: parseInt(options.midiChannel),
        gain: parseFloat(options.gain),
        waveform: options.waveform,
        tracks: options.tracks,
      });

      writeFileSync(options.output, data);
      console.log(`MIDI file written to: ${options.output}`);
    } catch (err) {
      console.error('Error generating MIDI:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
