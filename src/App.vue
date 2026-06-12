<template>  
	<v-app>
		<AdjacencyMatrix class="shader-bg" :notes="activeNotes" :size="128" :flowWeight="2.0" :harmonyWeight="1.0" :decay="0.95" :minNote="noteRange.min" :maxNote="noteRange.max" />
		<v-main>
		  <v-responsive class="align-center mx-auto pa-4 pb-8" max-width="900">
			<h1>GateRunner
      <v-btn 
          icon 
          @click="showHelp = true" 
          class="help-button"
        >
          <v-icon>mdi-help-circle</v-icon>
        </v-btn>
      </h1>
      <v-row>
        <v-col cols="12" md="8">
          <v-select
            v-model="selectedPresetId"
            label="Preset"
            :item-title="'title'"
            :item-value="'value'"
            :items="presetOptions"
            @update:modelValue="handlePresetSelection"
          />
        </v-col>
        <v-col cols="12" md="4" class="preset-summary-col">
          <div class="preset-summary">
            <div class="preset-name">{{ currentPresetName }}</div>
            <div class="preset-state">{{ isDirty ? 'Unsaved changes' : 'Saved' }}</div>
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col cols="12" md="8">
          <v-text-field
            v-model="presetNameInput"
            label="Preset name"
            placeholder="Type a preset name here"
            hide-details="auto"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-btn block class="preset-action-btn" color="info" variant="outlined" @click="renameCurrentPreset" :disabled="!canRenamePreset">Rename</v-btn>
        </v-col>
      </v-row>
      <v-row class="preset-actions-row">
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="primary" @click="saveCurrentPreset" :disabled="!currentPreset || !isDirty">Save</v-btn>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="primary" variant="tonal" @click="saveAsPreset">Save As</v-btn>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="secondary" variant="tonal" @click="createNewPreset">New</v-btn>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="error" variant="tonal" @click="deleteCurrentPreset">Delete</v-btn>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="white" variant="outlined" @click="exportCurrentPreset">Export Preset</v-btn>
        </v-col>
        <v-col cols="6" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="white" variant="outlined" @click="exportPresetLibrary">Export Library</v-btn>
        </v-col>
        <v-col cols="12" sm="4" md="3">
          <v-btn block class="preset-action-btn" color="white" variant="outlined" @click="triggerPresetImport">Import JSON</v-btn>
        </v-col>
      </v-row>
      <input
        ref="presetFileInput"
        type="file"
        accept=".json,application/json"
        class="preset-file-input"
        @change="handlePresetFileImport"
      />
			<v-row>
        <v-col cols="6">
          <v-autocomplete
            label="Forte number"
            v-model="forte"
            :items="allChords"
            placeholder="Forte number..."
            @update:modelValue="handleDraftChange"
          />
				</v-col>
        <v-col cols="6">
          <v-slider :label="'Tempo (' + bpm + ' BPM)'" min=1 step=1 max=499 v-model.number="bpm" @update:modelValue="handleDraftChange" />
        </v-col>
			</v-row>
      <v-row>
        <v-col cols="12" md="6">
          <v-select
            v-model="selectedTrackId"
            :items="trackOptions"
            :item-title="'title'"
            :item-value="'value'"
            label="Track"
            @update:modelValue="handleTrackSelection"
          />
			  </v-col>
			  <v-col cols="6" md="3">
          <v-btn block class="preset-action-btn" color="secondary" variant="tonal" @click="addTrack">Add Track</v-btn>
			  </v-col>
			  <v-col cols="6" md="3">
          <v-btn block class="preset-action-btn" color="error" variant="tonal" :disabled="tracks.length <= 1" @click="removeCurrentTrack">Remove Track</v-btn>
			  </v-col>
			</v-row>
      <v-row>
        <v-col cols="12" md="6">
          <v-text-field
            v-model="trackNameInput"
            label="Track name"
            hide-details="auto"
            @update:modelValue="handleTrackDraftChange"
          />
			  </v-col>
        <v-col cols="12" md="6">
          <v-select
            v-model="trackWaveform"
            label="Waveform"
            :items="['sine','square','triangle','sawtooth']"
            @update:modelValue="handleTrackDraftChange"
          />
			  </v-col>
			</v-row>
      <v-row>
        <v-col cols="12">
				  <v-text-field 
            :label="`Sequence (${selectedTrackSequenceLength})`"
            v-model="trackSequenceInput" 
            placeholder="e.g. 0 1 2..." 
		  @update:modelValue="handleTrackDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col colr="12">
          <v-slider :label="'Track Numerator (' + trackNumerator + ')'" min=1 step=1 max=16 v-model.number="trackNumerator" @update:modelValue="handleTrackDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
			  <v-col cols="12">
          <v-slider :label="'Track Denominator ('+ trackDenominator + ')'" min=1 step=1 max=16 v-model.number="trackDenominator" @update:modelValue="handleTrackDraftChange" />
				</v-col>
			</v-row>
      <v-row class="compact-row">
        <v-col cols="12">
				  <v-slider :label="'Octave shift ('+ trackOctave + ')'" min=0 step=1 max=10 v-model.number="trackOctave" @update:modelValue="handleTrackDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider 
            :label="'Track Note Length (' + trackLengthFactor + '%)'" 
            min="1" 
            max="400" 
            step="1" 
            v-model.number="trackLengthFactor" 
		  @update:modelValue="handleTrackDraftChange" 
          />
        </v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider
            :label="'Track Gain (' + Number(trackGain).toFixed(2) + 'x)'"
            min="0"
            max="4"
            step="0.05"
            v-model.number="trackGain"
            @update:modelValue="handleTrackDraftChange"
          />
        </v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider
            :label="'Track MIDI Channel (' + trackMidiChannel + ')'"
            min="1"
            max="16"
            step="1"
            v-model.number="trackMidiChannel"
            @update:modelValue="handleTrackDraftChange"
          />
        </v-col>
      </v-row>
      
      <v-row>
        <v-col cols="4">
          <v-switch 
            v-model="useMidiOutput" 
            label="MIDI" 
            @update:modelValue="updateMidiMode"
          />
        </v-col>
        <v-col cols="4" v-if="useMidiOutput">
          <v-select 
            v-model="selectedMidiDevice" 
            :items="midiDevices" 
            label="MIDI Device" 
            @update:modelValue="updateMidiDevice"
          />
        </v-col>
      </v-row>
      
			<button @click="toggleSequencer" class="stopplay">{{ isRunning ? '⏹️' : '▶️' }}</button>
      <button @click="copyURL" class="userbutton">📋Copy URL</button>
			<button @click="downloadMIDI" class="downloadmidi">Download MIDI</button>
      <button @click="downloadWAV" class="downloadwav">Download WAV</button>
      <br />
      <br />
      <!-- Help Modal -->
      
		  </v-responsive>
      <!-- Help Modal -->
      <v-dialog v-model="showHelp" max-width="800px">
          <v-card class="pa-4 bg-black">
            <v-card-title class="pa-4">
              <span class="text-h5 font-weight-bold">GateRunner <small style="font-size:0.6em; color:#888; margin-left:1em;">v{{ appVersion }}</small></span>
              <v-spacer></v-spacer>
              <v-btn icon @click="showHelp = false" class="close-btn">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-card-text class="pa-4">
              <h4 class="mb-2">How the Sequencer Works</h4>
              <p>The sequencer allows you to customize the following parameters:</p>
              <p>GateRunner now stores your work as named presets. Changes affect the current draft immediately for playback and URL sharing, but the preset itself is only updated when you use <strong>Save</strong> or <strong>Save As</strong>. You can also export a single preset or the full preset library to JSON and import them back later.</p>
              <ul>
                <li><strong>Preset</strong>: Pick a named preset, create a new one, save your current draft, or delete presets you no longer need.</li>
                <li><strong>Forte number</strong>: The pitch-class set to use as Forte number with transposition (see
                  <a target="_blank" href="https://en.wikipedia.org/wiki/List_of_set_classes">Forte numbers</a>).</li>
                <li><strong>BPM</strong>: Controls the tempo of the sequence.</li>
                <li><strong>Numerator/Denominator</strong>: Set per-track rhythmic grid while all tracks share one tempo.</li>
                <li><strong>Tracks</strong>: Each preset can contain multiple tracks with their own MIDI channel, waveform, gain, sequence, octave shift, and note length.</li>
                <li><strong>Waveform</strong>: Select from sine, square, triangle, or sawtooth waveforms per track.</li>
                <li><strong>Sequence</strong>: Input a sequence of numbers per track to generate notes based on their binary
                  representation.</li>
                <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played for the selected track.</li>
                <li><strong>Track Gain</strong>: Multiplies MIDI note velocity per track during export and live playback.</li>
                <li><strong>Note length</strong>: Multiplies the durations of the selected track's notes.</li>
                <li><strong>Import/Export</strong>: Export one preset or the full library as JSON for backup and sharing, then import those files later without overwriting your existing presets.</li>
                <li><strong>WAV Export</strong>: Render and download an offline WAV mix of all tracks in the current draft.</li>
              </ul>

              <h3 class="mt-4 mb-2">How Notes Are Computed in the Encoding Scheme</h3>
              <p>This application uses a binary-based encoding system to determine which notes are played from numerical
                values. Here's how it works:</p>

              <ol>
                <li><strong>Binary Representation of Numbers:</strong>
                  <ul>
                    <li>Each number's absolute value is converted into binary, with bit 0 at position 0, bit 1 at
                      position 1, and so on. For example:</li>
                    <ul>
                      <li>The number <code>5</code> becomes <code>101</code>.</li>
                      <li>The number <code>10</code> becomes <code>0101</code>.</li>
                    </ul>
                    <li>Negative numbers are supported and in this case the note indices are computed as you would
                      expect.</li>
                  </ul>
                </li>
                <li><strong>Pitch Class Assignment:</strong>
                  <ul>
                    <li>Each binary digit corresponds to a position in the selected pitch class set, with the octave shift, going up and down octavewise
                      to the minimal and maximal midi pitch. For example, to give a general idea without considering the octave, for 3-11B.00 you would get:
                      <ul>
                        <li>Position 0 = C</li>
                        <li>Position 1 = E</li>
                        <li>Position 2 = G</li>
                        <li>Position 3 = C</li>
                        <li>...</li>
                      </ul>
                    </li>
                  </ul>
                </li>
                <li><strong>Chords:</strong>
                  <ul>
                    <li>If multiple <code>1</code>s are present, the corresponding notes form a chord.</li>
                    <li>Example: The number <code>7</code> (<code>111</code>) maps to C, E, and G.</li>
                  </ul>
                </li>
              </ol>
            </v-card-text>
            <v-divider></v-divider>
            <v-card-actions class="pa-4">
              <v-spacer></v-spacer>
              <v-btn color="primary" @click="showHelp = false">Close</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-main>
  </v-app>
</template>

<script lang="ts">
import pkg from '../package.json';
const appVersion = pkg.version;
import { defineComponent, markRaw } from 'vue';
import AdjacencyMatrix from './components/AdjacencyMatrix.vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from 'ultra-mega-enumerator';
import {
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  arePresetDataEqual,
  buildDraftFromUrl,
  buildPresetLibraryExport,
  buildSinglePresetExport,
  clonePresetData,
  clonePresetTrackData,
  createNamedPreset,
  getSelectedPreset,
  hasUrlPresetOverrides,
  loadPresetLibrary,
  mergeImportedPresets,
  normalizePresetData,
  normalizePresetTrackData,
  parsePresetImportPayload,
  sanitizePresetName,
  sanitizeTrackName,
  savePresetLibrary,
  updatePresetData,
  type NamedPreset,
  type PresetData,
  type PresetLibrary,
  type PresetTrackData,
} from './presets';

function buildInitialState() {
  const presetLibrary = loadPresetLibrary();
  const selectedPreset = getSelectedPreset(presetLibrary);
  const draft = buildDraftFromUrl(window.location.search, selectedPreset.data);
  const selectedTrackId = draft.tracks[0]?.id ?? null;

  return {
    presetLibrary,
    selectedPresetId: selectedPreset.id,
    selectedTrackId,
    isDirty: hasUrlPresetOverrides(window.location.search) || !arePresetDataEqual(draft, selectedPreset.data),
    draft,
  };
}

const initialState = buildInitialState();

export default defineComponent({
  name: 'App',
  components: {
    AdjacencyMatrix
  },
  data() {
    const firstTrack = initialState.draft.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;
    return {
      bpm: initialState.draft.bpm,
      forte: initialState.draft.forte,
      tracks: initialState.draft.tracks.map((track) => clonePresetTrackData(track)) as PresetTrackData[],
      selectedTrackId: initialState.selectedTrackId as string | null,
      trackNameInput: firstTrack.name,
      trackNumerator: firstTrack.numerator,
      trackDenominator: firstTrack.denominator,
      trackWaveform: firstTrack.waveform,
      trackSequenceInput: firstTrack.sequenceInput,
      trackOctave: firstTrack.octave,
      trackLengthFactor: firstTrack.lengthFactor,
      trackMidiChannel: firstTrack.midiChannel,
      trackGain: firstTrack.gain,
      allChords: [] as string[],
      isRunning: false,
      trackLoops: {} as Record<string, Tone.Loop>,
      trackCounters: {} as Record<string, number>,
      showHelp: false,
      trackSynths: {} as Record<string, Tone.PolySynth>,
      useMidiOutput: false,
      midiDevices: [] as string[],
      selectedMidiDevice: null as string | null,
      midiAccess: null as MIDIAccess | null,
      midiOutput: null as MIDIOutput | null,
      appVersion: appVersion,
      activeNotes: [] as number[],
      presetLibrary: initialState.presetLibrary as PresetLibrary,
      selectedPresetId: initialState.selectedPresetId as string | null,
      isDirty: initialState.isDirty,
      presetNameInput: initialState.presetLibrary.presets.find((preset) => preset.id === initialState.selectedPresetId)?.name ?? '',
    };
  },
  computed: {
    currentPreset(): NamedPreset | null {
      return this.presetLibrary.presets.find((preset) => preset.id === this.presetLibrary.selectedPresetId) ?? this.presetLibrary.presets[0] ?? null;
    },
    currentPresetName(): string {
      return this.currentPreset?.name ?? 'No preset selected';
    },
    currentTrack(): PresetTrackData | null {
      return this.tracks.find((track) => track.id === this.selectedTrackId) ?? this.tracks[0] ?? null;
    },
    presetOptions(): Array<{ title: string; value: string }> {
      return this.presetLibrary.presets.map((preset) => ({
        title: preset.name,
        value: preset.id,
      }));
    },
    trackOptions(): Array<{ title: string; value: string }> {
      return this.tracks.map((track) => ({
        title: `${track.name} (ch ${track.midiChannel})`,
        value: track.id,
      }));
    },
    canRenamePreset(): boolean {
      if (!this.currentPreset) {
        return false;
      }

      const nextName = sanitizePresetName(this.presetNameInput);
      return nextName !== this.currentPreset.name;
    },
    selectedTrackSequenceLength(): number {
      return this.parseSequence(this.trackSequenceInput).length;
    },
    noteRange(): { min: number, max: number } {
      const allNotes = this.allTrackActualNotes.flatMap((entry) => entry.notes.flat());
      if (allNotes.length === 0) return { min: 0, max: 127 };
      const min = Math.min(...allNotes);
      const max = Math.max(...allNotes);
      // Add some padding
      const padding = Math.max(3, Math.floor((max - min) * 0.1));
      return { 
        min: Math.max(0, min - padding), 
        max: Math.min(127, max + padding) 
      };
    },
    scale(): number[] {
      const s = PCS12.parseForte(this.forte);
      const p = s?.asSequence() ?? [];
      const o: number[] = [];
      
      for (const n of p) {
        for (let i = 0; i <= 10; i += 1) {
          const t = n + (12 * i);
          if(t < 128) o.push(t);
        }
      }
      o.sort((a, b) => a - b);
      return o; 
    },
    allTrackActualNotes(): Array<{ track: PresetTrackData; notes: number[][] }> {
      return this.tracks.map((track) => ({
        track,
        notes: this.computeActualNotes(track),
      }));
    },
  },
  methods: {
    getTrackQuant(track: PresetTrackData): number {
      return 60.0 / (this.bpm * track.denominator);
    },
    parseSequence(sequenceInput: string): number[] {
      return sequenceInput
        .trim()
        .split(/\s+/)
        .map((n: string) => Number.parseInt(n.trim(), 10))
        .filter((n: number) => !Number.isNaN(n));
    },
    computeActualNotes(track: PresetTrackData): number[][] {
      const s = PCS12.parseForte(this.forte);
      if (!s) {
        return [];
      }

      const k = s.getK() ?? 0;
      const sequence = this.parseSequence(track.sequenceInput);

      return sequence.map((n: number) => {
        const bits = Math.abs(n).toString(2).split('').reverse();
        const sign = Math.sign(n) || 1;

        return this.scale.filter((_, idx) => {
          const bitIndex = sign * (idx - track.octave * k);
          return bitIndex >= 0 && bitIndex < bits.length && bits[bitIndex] === '1';
        });
      });
    },
    syncTrackEditorFromCurrent() {
      const track = this.currentTrack;
      if (!track) {
        return;
      }

      this.trackNameInput = track.name;
      this.trackNumerator = track.numerator;
      this.trackDenominator = track.denominator;
      this.trackWaveform = track.waveform;
      this.trackSequenceInput = track.sequenceInput;
      this.trackOctave = track.octave;
      this.trackLengthFactor = track.lengthFactor;
      this.trackMidiChannel = track.midiChannel;
      this.trackGain = track.gain;
    },
    applyTrackEditorToCurrent() {
      const currentTrack = this.currentTrack;
      if (!currentTrack) {
        return;
      }

      const normalizedTrack = normalizePresetTrackData({
        id: currentTrack.id,
        name: sanitizeTrackName(this.trackNameInput),
        numerator: this.trackNumerator,
        denominator: this.trackDenominator,
        waveform: this.trackWaveform,
        sequenceInput: this.trackSequenceInput,
        octave: this.trackOctave,
        lengthFactor: this.trackLengthFactor,
        midiChannel: this.trackMidiChannel,
        gain: this.trackGain,
      });

      this.tracks = this.tracks.map((track) => track.id === normalizedTrack.id ? normalizedTrack : track);
    },
    handleTrackSelection(nextTrackId: string | null) {
      if (!nextTrackId) {
        return;
      }

      this.selectedTrackId = nextTrackId;
      this.syncTrackEditorFromCurrent();
    },
    buildUniqueTrackName(baseName: string, excludedTrackId?: string): string {
      const existingNames = new Set(
        this.tracks
          .filter((track) => track.id !== excludedTrackId)
          .map((track) => track.name),
      );
      const sanitizedBaseName = sanitizeTrackName(baseName, this.tracks.length);
      if (!existingNames.has(sanitizedBaseName)) {
        return sanitizedBaseName;
      }

      let suffix = 2;
      while (existingNames.has(`${sanitizedBaseName} (${suffix})`)) {
        suffix += 1;
      }

      return `${sanitizedBaseName} (${suffix})`;
    },
    nextTrackChannel(): number {
      const used = new Set(this.tracks.map((track) => track.midiChannel));
      for (let channel = 1; channel <= 16; channel += 1) {
        if (!used.has(channel)) {
          return channel;
        }
      }
      return 1;
    },
    addTrack() {
      const nextTrack = normalizePresetTrackData({
        name: this.buildUniqueTrackName(`Track ${this.tracks.length + 1}`),
        numerator: this.currentTrack?.numerator ?? DEFAULT_PRESET_TRACK_DATA.numerator,
        denominator: this.currentTrack?.denominator ?? DEFAULT_PRESET_TRACK_DATA.denominator,
        waveform: this.currentTrack?.waveform ?? DEFAULT_PRESET_TRACK_DATA.waveform,
        sequenceInput: this.currentTrack?.sequenceInput ?? DEFAULT_PRESET_TRACK_DATA.sequenceInput,
        octave: this.currentTrack?.octave ?? DEFAULT_PRESET_TRACK_DATA.octave,
        lengthFactor: this.currentTrack?.lengthFactor ?? DEFAULT_PRESET_TRACK_DATA.lengthFactor,
        midiChannel: this.nextTrackChannel(),
        gain: this.currentTrack?.gain ?? DEFAULT_PRESET_TRACK_DATA.gain,
      }, this.tracks.length);

      this.tracks = [...this.tracks, nextTrack];
      this.selectedTrackId = nextTrack.id;
      this.syncTrackEditorFromCurrent();
      this.handleDraftChange();
    },
    removeCurrentTrack() {
      const currentTrack = this.currentTrack;
      if (!currentTrack || this.tracks.length <= 1) {
        return;
      }

      if (!window.confirm(`Delete track "${currentTrack.name}"?`)) {
        return;
      }

      const nextTracks = this.tracks.filter((track) => track.id !== currentTrack.id);
      this.tracks = nextTracks;
      this.selectedTrackId = nextTracks[0]?.id ?? null;
      this.syncTrackEditorFromCurrent();
      this.handleDraftChange();
    },
    handleTrackDraftChange() {
      this.applyTrackEditorToCurrent();
      this.handleDraftChange();
    },
    getTrackStepDuration(trackNotes: number[][], index: number): number {
      if (trackNotes.length === 0) {
        return 1;
      }

      for (let offset = 1; offset < trackNotes.length; offset += 1) {
        if (trackNotes[(index + offset) % trackNotes.length].length > 0) {
          return offset;
        }
      }

      return 1;
    },
    encodeWavFromChannels(channels: Float32Array[], sampleRate: number): Uint8Array {
      const numChannels = channels.length;
      const frameCount = channels[0]?.length ?? 0;
      const format = 1;
      const bitDepth = 16;
      const bytesPerSample = bitDepth / 8;
      const blockAlign = numChannels * bytesPerSample;
      const dataLength = frameCount * blockAlign;
      const wavBuffer = new ArrayBuffer(44 + dataLength);
      const view = new DataView(wavBuffer);

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
      view.setUint16(offset, format, true);
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
          const sample = Math.max(-1, Math.min(1, channels[channel][i]));
          const intSample = sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7FFF);
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }

      return new Uint8Array(wavBuffer);
    },
    sampleOscillator(phase: number, waveform: string): number {
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
    },
    getRenderDurationSeconds(): number {
      let total = 0;

      for (const entry of this.allTrackActualNotes) {
        const notesByStep = entry.notes;
        if (notesByStep.length === 0) {
          continue;
        }

        const trackQuant = this.getTrackQuant(entry.track);
        let trackMaxEnd = 0;

        for (let i = 0; i < notesByStep.length; i += 1) {
          const notes = notesByStep[i];
          if (notes.length === 0) {
            continue;
          }

          const durSteps = this.getTrackStepDuration(notesByStep, i);
          const duration = durSteps * trackQuant * entry.track.lengthFactor / 100.0;
          const end = i * trackQuant + duration;
          if (end > trackMaxEnd) {
            trackMaxEnd = end;
          }
        }

        if (trackMaxEnd > total) {
          total = trackMaxEnd;
        }
      }

      return Math.max(1, total + 0.25);
    },
    async renderMixWav(): Promise<Uint8Array> {
      const renderDuration = this.getRenderDurationSeconds();
      const sampleRate = 44100;
      const frameCount = Math.ceil(renderDuration * sampleRate);
      const left = new Float32Array(frameCount);
      const right = new Float32Array(frameCount);
      const attackSeconds = 0.005;
      const releaseSeconds = 0.03;

      for (const entry of this.allTrackActualNotes) {
        if (entry.notes.length === 0) {
          continue;
        }

        const trackQuant = this.getTrackQuant(entry.track);

        for (let i = 0; i < entry.notes.length; i += 1) {
          const notes = entry.notes[i];
          if (notes.length === 0) {
            continue;
          }

          const start = i * trackQuant;
          const durSteps = this.getTrackStepDuration(entry.notes, i);
          const duration = durSteps * trackQuant * entry.track.lengthFactor / 100.0;
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

              const sample = this.sampleOscillator(phase, entry.track.waveform) * noteAmplitude * env;
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
        left[i] = Math.max(-1, Math.min(1, left[i]));
        right[i] = Math.max(-1, Math.min(1, right[i]));
      }

      return this.encodeWavFromChannels([left, right], sampleRate);
    },
    getDraftData(): PresetData {
      return normalizePresetData({
        bpm: this.bpm,
        forte: this.forte,
        tracks: this.tracks.map((track) => clonePresetTrackData(track)),
      });
    },
    applyDraftData(data: PresetData) {
      const normalized = clonePresetData(normalizePresetData(data));
      this.bpm = normalized.bpm;
      this.forte = normalized.forte;

      const fallbackTrackId = normalized.tracks[0]?.id ?? null;
      const preferredTrackId = normalized.tracks.some((track) => track.id === this.selectedTrackId)
        ? this.selectedTrackId
        : fallbackTrackId;
      this.tracks = normalized.tracks.map((track) => clonePresetTrackData(track));
      this.selectedTrackId = preferredTrackId;
      this.syncTrackEditorFromCurrent();
      this.applyRealtimeSettings();
    },
    applyRealtimeSettings() {
      Tone.getTransport().bpm.value = this.bpm;
      const signatureTrack = this.currentTrack ?? this.tracks[0];
      if (signatureTrack) {
        Tone.getTransport().timeSignature = [signatureTrack.numerator, signatureTrack.denominator];
      }
      this.updateSynths();

      if (this.isRunning) {
        this.rebuildTrackLoops();
      }
    },
    refreshDirtyState() {
      const currentPreset = this.currentPreset;
      this.isDirty = currentPreset ? !arePresetDataEqual(this.getDraftData(), currentPreset.data) : false;
    },
    syncPresetNameInput(nextName?: string) {
      this.presetNameInput = nextName ?? this.currentPreset?.name ?? '';
    },
    persistPresetLibrary(library: PresetLibrary) {
      this.presetLibrary = library;
      savePresetLibrary(library);
    },
    loadPresetById(presetId: string, libraryOverride?: PresetLibrary) {
      const library = libraryOverride ?? this.presetLibrary;
      const preset = library.presets.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }

      const nextLibrary: PresetLibrary = {
        ...library,
        selectedPresetId: preset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = preset.id;
      this.syncPresetNameInput(preset.name);
      this.applyDraftData(preset.data);
      this.refreshDirtyState();
    },
    handleDraftChange() {
      this.applyRealtimeSettings();
      this.refreshDirtyState();
    },
    confirmDiscardChanges(actionLabel: string): boolean {
      if (!this.isDirty) {
        return true;
      }

      return window.confirm(`You have unsaved changes. ${actionLabel}?`);
    },
    handlePresetSelection(nextPresetId: string | null) {
      const currentPresetId = this.presetLibrary.selectedPresetId;
      if (!nextPresetId || nextPresetId === currentPresetId) {
        return;
      }

      if (!this.confirmDiscardChanges('Load another preset and discard them')) {
        this.selectedPresetId = currentPresetId;
        return;
      }

      this.loadPresetById(nextPresetId);
    },
    buildUniquePresetName(baseName: string, excludedPresetId?: string): string {
      const existingNames = new Set(
        this.presetLibrary.presets
          .filter((preset) => preset.id !== excludedPresetId)
          .map((preset) => preset.name),
      );
      const sanitizedBaseName = sanitizePresetName(baseName);
      if (!existingNames.has(sanitizedBaseName)) {
        return sanitizedBaseName;
      }

      let suffix = 2;
      while (existingNames.has(`${sanitizedBaseName} (${suffix})`)) {
        suffix += 1;
      }

      return `${sanitizedBaseName} (${suffix})`;
    },
    renameCurrentPreset() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      const nextName = this.buildUniquePresetName(this.presetNameInput, currentPreset.id);
      if (nextName === currentPreset.name) {
        this.syncPresetNameInput(currentPreset.name);
        return;
      }

      const renamedPreset: NamedPreset = {
        ...currentPreset,
        name: nextName,
      };
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: this.presetLibrary.presets.map((preset) => preset.id === renamedPreset.id ? renamedPreset : preset),
        selectedPresetId: renamedPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = renamedPreset.id;
      this.syncPresetNameInput(renamedPreset.name);
      window.alert(`Renamed preset to "${renamedPreset.name}".`);
    },
    saveCurrentPreset() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      const updatedPreset = updatePresetData(currentPreset, this.getDraftData());
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: this.presetLibrary.presets.map((preset) => preset.id === updatedPreset.id ? updatedPreset : preset),
        selectedPresetId: updatedPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = updatedPreset.id;
      this.syncPresetNameInput(updatedPreset.name);
      this.refreshDirtyState();
      window.alert(`Saved preset "${updatedPreset.name}".`);
    },
    saveAsPreset() {
      const name = this.buildUniquePresetName(this.presetNameInput || `${this.currentPreset?.name ?? 'Preset'} Copy`);
      const newPreset = createNamedPreset(name, this.getDraftData());
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, newPreset],
        selectedPresetId: newPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = newPreset.id;
      this.syncPresetNameInput(newPreset.name);
      this.applyDraftData(newPreset.data);
      this.refreshDirtyState();
      window.alert(`Created preset "${newPreset.name}".`);
    },
    createNewPreset() {
      if (!this.confirmDiscardChanges('Create a new preset and discard them')) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      const name = this.buildUniquePresetName(this.presetNameInput || 'New preset');
      const preset = createNamedPreset(name, DEFAULT_PRESET_DATA);
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, preset],
        selectedPresetId: preset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = preset.id;
      this.syncPresetNameInput(preset.name);
      this.applyDraftData(preset.data);
      this.refreshDirtyState();
    },
    deleteCurrentPreset() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      if (!this.confirmDiscardChanges(`Delete preset "${currentPreset.name}" and discard them`)) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      if (!window.confirm(`Delete preset "${currentPreset.name}"? This cannot be undone.`)) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      const remainingPresets = this.presetLibrary.presets.filter((preset) => preset.id !== currentPreset.id);
      const fallbackPreset = remainingPresets[0] ?? createNamedPreset('Default', DEFAULT_PRESET_DATA);
      const nextPresets = remainingPresets.length > 0 ? remainingPresets : [fallbackPreset];
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: nextPresets,
        selectedPresetId: fallbackPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = fallbackPreset.id;
      this.syncPresetNameInput(fallbackPreset.name);
      this.applyDraftData(fallbackPreset.data);
      this.refreshDirtyState();
    },
    sanitizeFilenamePart(value: string) {
      return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'preset';
    },
    downloadJson(filename: string, payload: object) {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    buildLibraryForExport(): PresetLibrary {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return this.presetLibrary;
      }

      const currentDraft = this.getDraftData();
      return {
        ...this.presetLibrary,
        presets: this.presetLibrary.presets.map((preset) => preset.id === currentPreset.id ? updatePresetData(preset, currentDraft) : preset),
      };
    },
    exportCurrentPreset() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      const exportPreset = updatePresetData(currentPreset, this.getDraftData());
      const filename = `gaterunner-preset-${this.sanitizeFilenamePart(exportPreset.name)}-${this.formattedDate()}.json`;
      this.downloadJson(filename, buildSinglePresetExport(exportPreset));
    },
    exportPresetLibrary() {
      const libraryForExport = this.buildLibraryForExport();
      const filename = `gaterunner-preset-library-${this.formattedDate()}.json`;
      this.downloadJson(filename, buildPresetLibraryExport(libraryForExport));
    },
    triggerPresetImport() {
      (this.$refs.presetFileInput as HTMLInputElement | undefined)?.click();
    },
    async handlePresetFileImport(event: Event) {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) {
        return;
      }

      try {
        const payload = parsePresetImportPayload(await file.text());
        const importedPresets = payload.kind === 'single-preset' ? [payload.preset] : payload.presets;
        const preferredSelectedPresetId = payload.kind === 'single-preset' ? payload.preset.id : payload.selectedPresetId;
        const mergeResult = mergeImportedPresets(this.presetLibrary.presets, importedPresets, preferredSelectedPresetId);
        const nextLibrary: PresetLibrary = {
          ...this.presetLibrary,
          presets: mergeResult.presets,
          selectedPresetId: this.presetLibrary.selectedPresetId,
        };

        this.persistPresetLibrary(nextLibrary);
        this.selectedPresetId = this.presetLibrary.selectedPresetId;

        const importedCount = mergeResult.importedPresets.length;
        if (importedCount === 0) {
          window.alert('No presets were imported.');
          return;
        }

        if (mergeResult.selectedPresetId && this.confirmDiscardChanges('Load the imported preset and discard them')) {
          this.loadPresetById(mergeResult.selectedPresetId, nextLibrary);
        } else {
          this.selectedPresetId = this.presetLibrary.selectedPresetId;
          this.syncPresetNameInput();
        }

        window.alert(`Imported ${importedCount} preset${importedCount === 1 ? '' : 's'}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to import preset file.';
        window.alert(message);
      } finally {
        input.value = '';
      }
    },
    formattedDate() {
      return (timestamp => `${new Date(timestamp).getUTCFullYear()}${String(new Date(timestamp).getUTCMonth() + 1).padStart(2, '0')}${String(new Date(timestamp).getUTCDate()).padStart(2, '0')}T${String(new Date(timestamp).getUTCHours()).padStart(2, '0')}${String(new Date(timestamp).getUTCMinutes()).padStart(2, '0')}${String(new Date(timestamp).getUTCSeconds()).padStart(2, '0')}Z`)(Date.now());
    },
    async initializeMidi() {
      try {
        const access = await navigator.requestMIDIAccess();
        this.midiAccess = access;
        
        this.midiDevices = Array.from(access.outputs.values()).map(output => output.name!);
      } catch (error) {
        console.error("Failed to initialize MIDI:", error);
      }
    },
    updateMidiDevice() {
      const device = Array.from(this.midiAccess?.outputs.values() || []).find(output => output.name === this.selectedMidiDevice);
      this.midiOutput = device || null;
    },
    updateMidiMode() {
      if (this.useMidiOutput) {
        this.initializeMidi();
      } else {
        //this.midiOutput = null;
      }
    },
    async playNoteWithMidi(note: number, velocity: number, duration: Tone.Unit.Seconds, when: number, midiChannel: number) {
      if (this.midiOutput!!) {
          const noteOn = [0x90 + midiChannel - 1, note, Math.round(velocity * 127)];
          const noteOff = [0x80 + midiChannel - 1, note, 0];

          // 'when' is in the AudioContext time coordinates; convert to Performance timeline
          const ctxNow = Tone.now();
          const nowMs = performance.now();
          // Schedule relative to now; clamp to 0 to avoid negative scheduling
          const delayMs = Math.max(0, (when - ctxNow) * 1000);
          const onTimeMs = nowMs + delayMs;
          const offTimeMs = onTimeMs + Number(duration) * 1000;

          this.midiOutput!.send(noteOn, onTimeMs);
          this.midiOutput!.send(noteOff, offTimeMs);
      }
    },
    getOrCreateSynth(trackId: string): Tone.PolySynth {
      const existing = this.trackSynths[trackId];
      if (existing) {
        return existing;
      }

      const synth = markRaw(new Tone.PolySynth(Tone.Synth).toDestination());
      this.trackSynths[trackId] = synth;
      return synth;
    },
    updateSynths() {
      const activeTrackIds = new Set(this.tracks.map((track) => track.id));
      for (const [trackId, synth] of Object.entries(this.trackSynths)) {
        if (!activeTrackIds.has(trackId)) {
          synth.dispose();
          delete this.trackSynths[trackId];
        }
      }

      for (const track of this.tracks) {
        const synth = this.getOrCreateSynth(track.id);
        const waveformType = track.waveform === 'triangle'
          ? 'triangle'
          : track.waveform === 'sawtooth'
            ? 'sawtooth'
            : track.waveform === 'square'
              ? 'square'
              : 'sine';

        synth.set({
          envelope: {
            attackCurve: 'exponential',
            attack: (this.getTrackQuant(track) / 2.0).toString() + 's',
            decay: 0,
            releaseCurve: 'exponential',
            release: (this.getTrackQuant(track) / 2.0).toString() + 's',
            sustain: 1.0,
          },
          oscillator: {
            type: waveformType,
          },
        });

        synth.context.lookAhead = 0.05;
      }
    },
    async getMidi(): Promise<Midi> {
      const midi = new Midi();
      
      midi.header.setTempo(this.bpm);

      for (const entry of this.allTrackActualNotes) {
        const notesByStep = entry.notes;
        if (notesByStep.length === 0) {
          continue;
        }

        const track = midi.addTrack();
        track.channel = entry.track.midiChannel - 1;
        const trackQuant = this.getTrackQuant(entry.track);

        for (let i = 0; i < notesByStep.length; i += 1) {
          const notes = notesByStep[i];
          if (notes.length === 0) {
            continue;
          }

          const dur = this.getTrackStepDuration(notesByStep, i);
          const vel = Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * entry.track.gain);

          for (const note of notes) {
            track.addNote({
              midi: note,
              time: i * trackQuant,
              duration: dur * trackQuant * entry.track.lengthFactor / 100.0,
              velocity: vel,
            });
          }
        }
      }
      
      return midi;
    },
    async toggleSequencer() {
      if (this.isRunning) {
        this.stopSequencer();
      } else {
        this.startSequencer();
      }
    },
    async copyURL() {
      const track = this.currentTrack ?? this.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;
      await navigator.clipboard.writeText(encodeURI(`https://ncg777.github.io/gaterunner/?bpm=${this.bpm}&numerator=${track.numerator}&denominator=${track.denominator}&waveform=${track.waveform}&octave=${track.octave}&forte=${this.forte}&lengthFactor=${track.lengthFactor}&sequence=${track.sequenceInput}`));
      window.alert("URL copied to clipboard.");
    },
    stopTrackLoops() {
      for (const loop of Object.values(this.trackLoops)) {
        loop.stop();
        loop.dispose();
      }
      this.trackLoops = {};
      this.trackCounters = {};
    },
    rebuildTrackLoops() {
      if (!this.isRunning) {
        return;
      }

      this.stopTrackLoops();

      for (const entry of this.allTrackActualNotes) {
        if (entry.notes.length === 0) {
          continue;
        }

        const loop = new Tone.Loop((when) => {
          const counter = this.trackCounters[entry.track.id] ?? 0;
          this.playTrackStep(entry.track, entry.notes, counter, when);
          this.trackCounters[entry.track.id] = (counter + 1) % entry.notes.length;
        }, this.getTrackQuant(entry.track).toString() + 's');

        this.trackCounters[entry.track.id] = 0;
        loop.start(0);
        this.trackLoops[entry.track.id] = loop;
      }
    },
    async startSequencer() {
      if(this.isRunning) return;
      this.isRunning = true;
      await Tone.start();
      this.applyRealtimeSettings();
      this.rebuildTrackLoops();
      Tone.getTransport().seconds = 0;
      Tone.getTransport().start();
    },
    stopSequencer() {
      if(!this.isRunning) return;
      this.isRunning = false;
      this.stopTrackLoops();
      Tone.getTransport().stop();
      Tone.getTransport().seconds=0;
      this.activeNotes = [];
    },
    playTrackStep(track: PresetTrackData, trackNotes: number[][], counter: number, when: Tone.Unit.Seconds) {
      const arr = trackNotes[counter % trackNotes.length];
      this.activeNotes = Array.from(new Set([...this.activeNotes, ...arr])).sort((left, right) => left - right);

      if (arr.length === 0) {
        return;
      }

      const dur = this.getTrackStepDuration(trackNotes, counter);
      const vel = Math.min(1, 0.5 * Math.sqrt(1.0 / arr.length) * track.gain);
      const noteDuration = dur * this.getTrackQuant(track) * track.lengthFactor / 100.0;

      if (this.useMidiOutput) {
        for (const note of arr) {
          this.playNoteWithMidi(note, vel, noteDuration, when, track.midiChannel);
        }
      } else {
        const synth = this.getOrCreateSynth(track.id);
        synth.triggerAttackRelease(
          arr.map((note) => Tone.Frequency(note, 'midi').toFrequency()),
          noteDuration.toString() + 's',
          when,
          vel,
        );
      }

      window.setTimeout(() => {
        const remaining = new Set(this.activeNotes);
        for (const note of arr) {
          remaining.delete(note);
        }
        this.activeNotes = Array.from(remaining.values()).sort((left, right) => left - right);
      }, Math.max(0, Math.floor(noteDuration * 1000)));
    },

    async downloadMIDI() {
      const data = (await this.getMidi()).toArray();
      const blob = new Blob([Uint8Array.from(data)], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);
      const signatureTrack = this.currentTrack ?? this.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;

      const a = document.createElement('a');
      a.href = url;
      a.download = `GateRunner-${this.formattedDate().toString()}-${this.forte}-${this.bpm}bpm-${signatureTrack.numerator}on${signatureTrack.denominator}timesig.mid`;
      a.click();

      // Clean up the URL object
      URL.revokeObjectURL(url);
    },
    async downloadWAV() {
      const data = await this.renderMixWav();
      const wavBuffer = new ArrayBuffer(data.byteLength);
      new Uint8Array(wavBuffer).set(data);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `GateRunner-${this.formattedDate().toString()}-${this.forte}-${this.bpm}bpm-mix.wav`;
      a.click();

      URL.revokeObjectURL(url);
    }
  },
  async beforeMount() {
      await PCS12.init();
      const arr = Array.from(PCS12.getChords()).map(c => c.toString());
      arr.sort(PCS12.ReverseForteStringComparator);
      this.allChords=arr;
      this.syncTrackEditorFromCurrent();
      this.applyRealtimeSettings();
  },
  beforeUnmount() {
    this.stopSequencer();
    for (const synth of Object.values(this.trackSynths)) {
      synth.dispose();
    }
    this.trackSynths = {};
  },
  async onMounted() {
    this.applyRealtimeSettings();
    if (this.useMidiOutput) {
      await this.initializeMidi();
  }
  }
});
</script>

<style scoped>
.shader-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
}

:deep(.v-application) {
  background: transparent !important;
}

:deep(.v-main) {
  background: transparent !important;
  position: relative;
  z-index: 1;
}

:deep(.v-responsive) {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 16px;
  padding: 16px;
}

:deep(.v-label),
:deep(.v-field__input),
:deep(.v-select__selection-text),
:deep(.v-autocomplete__selection-text) {
  color: #ffffff !important;
}
h1 {
  text-align: center;
  margin-bottom: 16pt;
  color: #ffffff;
}

.downloadmidi,
.downloadwav,
.userbutton,
.stopplay {
  color: #ffffff;
}

.preset-summary-col {
  display: flex;
  align-items: center;
}

.preset-summary {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}

.preset-name {
  color: #ffffff;
  font-weight: 700;
}

.preset-state {
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.9rem;
}

.preset-actions-row {
  margin-bottom: 8px;
}

.preset-action-btn {
  color: #ffffff !important;
}

.preset-action-btn:deep(.v-btn__content) {
  color: #ffffff !important;
}

.preset-file-input {
  display: none;
}

.downloadmidi {
  padding: 10px;
  font-size: 18px;
  width: 100%;
}
.downloadwav {
  padding: 10px;
  font-size: 18px;
  width: 100%;
}
.userbutton {
  padding: 10px;
  font-size: 18px;
  width: 100%;
}
.stopplay {
  padding: 2px;
  font-size: 50px;
  width: 100%;
  margin-bottom: 5px;
}
.close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
}
.compact-row * {
  padding:0;
  margin-bottom: 0;
  margin-top: 0;
}
</style>