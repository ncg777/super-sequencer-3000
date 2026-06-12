#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { writeFileSync } from 'fs';
import { generateMidi } from './generate.js';

const server = new Server(
  {
    name: 'gaterunner',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'generate_midi',
        description:
          'Generate a MIDI file using GateRunner. ' +
          'Converts a sequence of integers to MIDI notes using a Forte number (pitch-class set). ' +
          'Each integer is binary-encoded: each set bit maps to a pitch from the chosen scale.',
        inputSchema: {
          type: 'object',
          properties: {
            output: {
              type: 'string',
              description: 'Absolute or relative path where the MIDI file will be saved.',
            },
            bpm: {
              type: 'number',
              description: 'Shared tempo in beats per minute (1-499). Default: 90.',
            },
            numerator: {
              type: 'number',
              description: 'Legacy single-track numerator (1-16). Used when tracks is omitted. Default: 4.',
            },
            denominator: {
              type: 'number',
              description: 'Legacy single-track denominator (1-16). Used when tracks is omitted. Default: 5.',
            },
            forte: {
              type: 'string',
              description:
                'Forte number identifying the pitch-class set (e.g. "5-35.05" for pentatonic). Default: "5-35.05".',
            },
            sequence: {
              type: 'string',
              description:
                'Space-separated integers to encode as notes (e.g. "1 2 4 8 16"). Each number is binary-encoded: bit N selects the Nth pitch of the scale. Default: "1 2 4 8 16".',
            },
            octave: {
              type: 'number',
              description: 'Octave shift (0-10). Default: 6.',
            },
            lengthFactor: {
              type: 'number',
              description:
                'Note length as a percentage of the quantization step (1-400). Default: 100.',
            },
            midiChannel: {
              type: 'number',
              description: 'Legacy single-track MIDI channel (1-16). Used when tracks is omitted. Default: 1.',
            },
            gain: {
              type: 'number',
              description: 'Legacy single-track gain multiplier (0-4). Used when tracks is omitted. Default: 1.',
            },
            waveform: {
              type: 'string',
              description: 'Legacy single-track waveform metadata. Used when tracks is omitted. Default: "sine".',
            },
            tracks: {
              type: 'array',
              description:
                'Optional multi-track configuration. Each track may include name, numerator, denominator, waveform, sequence, octave, lengthFactor, midiChannel, gain.',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  numerator: { type: 'number' },
                  denominator: { type: 'number' },
                  waveform: { type: 'string' },
                  sequence: { type: 'string' },
                  octave: { type: 'number' },
                  lengthFactor: { type: 'number' },
                  midiChannel: { type: 'number' },
                  gain: { type: 'number' },
                },
              },
            },
          },
          required: ['output'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'generate_midi') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as Record<string, unknown>;
  const output = args['output'] as string;

  if (!output) {
    return {
      content: [{ type: 'text', text: 'Error: output path is required' }],
      isError: true,
    };
  }

  const optNum = (key: string) =>
    args[key] !== undefined ? Number(args[key]) : undefined;
  const optStr = (key: string) =>
    args[key] !== undefined ? String(args[key]) : undefined;

  try {
    const data = await generateMidi({
      bpm: optNum('bpm'),
      numerator: optNum('numerator'),
      denominator: optNum('denominator'),
      forte: optStr('forte'),
      sequence: optStr('sequence'),
      octave: optNum('octave'),
      lengthFactor: optNum('lengthFactor'),
      midiChannel: optNum('midiChannel'),
      gain: optNum('gain'),
      waveform: optStr('waveform'),
      tracks: Array.isArray(args['tracks']) ? (args['tracks'] as Record<string, unknown>[]) : undefined,
    });

    writeFileSync(output, data);

    return {
      content: [
        {
          type: 'text',
          text: `MIDI file successfully written to: ${output}`,
        },
      ],
    };
  } catch (err) {
    return {
      content: [
        {
          type: 'text',
          text: `Error generating MIDI: ${err instanceof Error ? err.message : String(err)}`,
        },
      ],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
