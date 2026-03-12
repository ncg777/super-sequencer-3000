#!/usr/bin/env node
import { Command } from 'commander';
import { writeFileSync } from 'fs';
import { generateMidi } from './generate.js';

const program = new Command();

program
  .name('super-sequencer-3000')
  .description('Generate a MIDI file from a Super Sequencer 3000 sequence')
  .version('1.0.0')
  .requiredOption('-o, --output <file>', 'Output MIDI file path')
  .option('--bpm <number>', 'Tempo in beats per minute (1-499)', '90')
  .option('--numerator <number>', 'Time signature numerator (1-16, no effect on output)', '4')
  .option('--denominator <number>', 'Time signature denominator (1-16)', '5')
  .option('--forte <string>', 'Forte number (pitch-class set identifier)', '5-35.05')
  .option('--sequence <string>', 'Space-separated integers to encode as notes', '1 2 4 8 16')
  .option('--octave <number>', 'Octave shift (0-10)', '6')
  .option('--length-factor <number>', 'Note length as percentage of quantization step (1-400)', '100')
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
      });

      writeFileSync(options.output, data);
      console.log(`MIDI file written to: ${options.output}`);
    } catch (err) {
      console.error('Error generating MIDI:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
