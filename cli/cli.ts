#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { generateMidi, generateWav, type GenerateReverbOptions, type GenerateTrackOptions } from './generate.js';

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

function parseReverbJson(value: string): GenerateReverbOptions {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('reverb must be a JSON object');
    }
    return parsed as GenerateReverbOptions;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid --reverb JSON: ${message}`);
  }
}

program
  .name('gaterunner')
  .description('Generate a MIDI file from a GateRunner sequence')
  .version('2026.7.10')
  .requiredOption('-o, --output <file>', 'Output MIDI file path')
  .option('-f, --format <type>', 'Output format: midi or wav', 'midi')
  .option('--bpm <number>', 'Shared tempo in beats per minute (1-499)', '90')
  .option('--a4 <number>', 'Concert pitch A4 frequency in Hz (380-500)', '440')
  .option('--numerator <number>', 'Legacy single-track numerator (1-16)', '4')
  .option('--denominator <number>', 'Legacy single-track denominator (1-16)', '5')
  .option('--forte <string>', 'Forte number (pitch-class set identifier)', '5-35.05')
  .option('--sequence <string>', 'Legacy single-track sequence', '1 2 4 8 16')
  .option('--octave <number>', 'Legacy single-track octave (0-10)', '6')
  .option('--length-factor <number>', 'Legacy single-track note length percent (1-400)', '100')
  .option('--midi-channel <number>', 'Legacy single-track MIDI channel (1-16)', '1')
  .option('--gain <number>', 'Legacy single-track audio gain in dB (-96 to +24)', '0')
  .option('--waveform <string>', 'Legacy single-track waveform metadata', 'sine')
  .option('--delay <number>', 'Legacy single-track delay in bars (0-64)', '0')
  .option('--repeats <number>', 'Legacy single-track number of pattern repetitions (1-64)', '1')
  .option('--tracks <json>', 'JSON array of tracks with per-track sequence, instrument, filter, echoDelay notation (1/1..1/16T), and reverb send controls', parseTracksJson)
  .option('--reverb <json>', 'JSON object with global reverb enabled, decay, preDelay, wet, lowCut, highCut', parseReverbJson)
  .action(async (options) => {
    try {
      const generatorInput = {
        bpm: parseInt(options.bpm),
        a4: parseFloat(options.a4),
        numerator: parseInt(options.numerator),
        denominator: parseInt(options.denominator),
        forte: options.forte,
        sequence: options.sequence,
        octave: parseInt(options.octave),
        lengthFactor: parseInt(options.lengthFactor),
        midiChannel: parseInt(options.midiChannel),
        gain: parseFloat(options.gain),
        waveform: options.waveform,
        delay: parseInt(options.delay),
        repeats: parseInt(options.repeats),
        tracks: options.tracks,
        reverb: options.reverb,
      };

      const normalizedFormat = String(options.format ?? 'midi').toLowerCase();
      const isWav = normalizedFormat === 'wav';
      if (!isWav && normalizedFormat !== 'midi') {
        throw new Error(`Unsupported format: ${options.format}. Use midi or wav.`);
      }

      const data = isWav
        ? await generateWav(generatorInput)
        : await generateMidi(generatorInput);

      writeFileSync(options.output, data);
      console.log(`${isWav ? 'WAV' : 'MIDI'} file written to: ${options.output}`);
    } catch (err) {
      console.error('Error generating output:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
