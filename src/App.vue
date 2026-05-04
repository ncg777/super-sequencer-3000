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
          <v-select v-model="waveform" label="Waveform" :items="['sine','square','triangle','sawtooth']" @update:modelValue="handleDraftChange" />
			  </v-col>
			</v-row>
      <v-row>
        <v-col cols="12">
				  <v-text-field 
            :label="`Sequence (${sequence.length})`"
            v-model="sequenceInput" 
            placeholder="e.g. 0 1 2..." 
          @update:modelValue="handleDraftChange" />
				</v-col>
      </v-row>
			<v-row class="compact-row">
			  <v-col cols="12">
          <v-slider :label="'Tempo (' + bpm + ' BPM)'" min=1 step=1 max=499 v-model.number="bpm" @update:modelValue="handleDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col colr="12">
          <v-slider :label="'Numerator (' + numerator + ')'" min=1 step=1 max=16 v-model.number="numerator" @update:modelValue="handleDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
			  <v-col cols="12">
          <v-slider :label="'Denominator ('+ denominator + ')'" min=1 step=1 max=16 v-model.number="denominator" @update:modelValue="handleDraftChange" />
				</v-col>
			</v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider :label="'Octave shift ('+ octave + ')'" min=0 step=1 max=10 v-model.number="octave" @update:modelValue="handleDraftChange" />
				</v-col>
      </v-row>
      <v-row class="compact-row">
        <v-col cols="12">
          <v-slider 
            :label="'Note Length (' + lengthFactor + '%)'" 
            min="1" 
            max="400" 
            step="1" 
            v-model.number="lengthFactor" 
          @update:modelValue="handleDraftChange" 
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
        <v-col cols="4" v-if="useMidiOutput">
          <v-slider 
            :label="'Channel (' + midiChannel + ')'" 
            min="1" 
            max="16" 
            step="1" 
            v-model.number="midiChannel"
          />
        </v-col>
      </v-row>
      
			<button @click="toggleSequencer" class="stopplay">{{ isRunning ? '⏹️' : '▶️' }}</button>
      <button @click="copyURL" class="userbutton">📋Copy URL</button>
			<button @click="downloadMIDI" class="downloadmidi">Download MIDI</button>
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
                <li><strong>Numerator</strong>: The top number of the time signature.</li>
                <li><strong>Denominator</strong>: The bottom number of the time signature.</li>
                <li><strong>Waveform</strong>: Select from sine, square, triangle, or sawtooth waveforms.</li>
                <li><strong>Sequence</strong>: Input a sequence of numbers to generate notes based on their binary
                  representation.</li>
                <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played.</li>
                <li><strong>Note length</strong>: Multiplies the durations of the notes played.</li>
                <li><strong>Import/Export</strong>: Export one preset or the full library as JSON for backup and sharing, then import those files later without overwriting your existing presets.</li>
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
  arePresetDataEqual,
  buildDraftFromUrl,
  buildPresetLibraryExport,
  buildSinglePresetExport,
  clonePresetData,
  createNamedPreset,
  getSelectedPreset,
  hasUrlPresetOverrides,
  loadPresetLibrary,
  mergeImportedPresets,
  normalizePresetData,
  parsePresetImportPayload,
  sanitizePresetName,
  savePresetLibrary,
  updatePresetData,
  type NamedPreset,
  type PresetData,
  type PresetLibrary,
} from './presets';

function buildInitialState() {
  const presetLibrary = loadPresetLibrary();
  const selectedPreset = getSelectedPreset(presetLibrary);
  const draft = buildDraftFromUrl(window.location.search, selectedPreset.data);

  return {
    presetLibrary,
    selectedPresetId: selectedPreset.id,
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
    return {
      bpm: initialState.draft.bpm,
      numerator: initialState.draft.numerator,
      denominator: initialState.draft.denominator,
      waveform: initialState.draft.waveform,
      sequenceInput: initialState.draft.sequenceInput,
      octave: initialState.draft.octave,
      lengthFactor: initialState.draft.lengthFactor,
      allChords: [] as string[],
      isRunning: false,
      loop: null as Tone.Loop|null,
      forte: initialState.draft.forte,
      counter: 0,
      showHelp: false,
      synth: markRaw(new Tone.PolySynth(Tone.Synth).toDestination()),
      useMidiOutput: false,
      midiDevices: [] as string[],
      selectedMidiDevice: null,
      midiChannel: 1,
      midiAccess: null as MIDIAccess | null,
      midiOutput: null as MIDIOutput | null,
      appVersion: appVersion,
      pnowMs: -1,
      transportnowMs:-1,
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
    presetOptions(): Array<{ title: string; value: string }> {
      return this.presetLibrary.presets.map((preset) => ({
        title: preset.name,
        value: preset.id,
      }));
    },
    canRenamePreset(): boolean {
      if (!this.currentPreset) {
        return false;
      }

      const nextName = sanitizePresetName(this.presetNameInput);
      return nextName !== this.currentPreset.name;
    },
    synth():Tone.PolySynth {
      const o = markRaw(new Tone.PolySynth(Tone.Synth,{
          envelope:{
            attackCurve: 'exponential',
            attack: (this.quant/2.0).toString()+"s",
            decay:0,
            releaseCurve: 'exponential',
            release: (this.quant/2.0).toString()+"s",
            sustain: 1.0
          },
          oscillator: {
                type: 
                  this.waveform === "triangle" ? 'triangle' : 
                    this.waveform === "sawtooth" ? 'sawtooth' : 
                      this.waveform === "square" ? 'square' : 'sine1'
          }
        }).toDestination());
        // Use a small lookAhead so playback feels immediate while keeping scheduling stable
        o.context.lookAhead = 0.05;
        return o;
    },
    noteRange(): { min: number, max: number } {
      const allNotes = this.actualNotes.flat();
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
    quant() {return 60.0/(this.bpm*this.denominator);},
    sequence(): number[] {
      return this.sequenceInput
        .split(' ')
        .map((n:string) => parseInt(n.trim()))
        .filter((n:number) => !isNaN(n));
    },
    scale(): number[] {
      const s = PCS12.parseForte(this.forte);
      const p = s?.asSequence()||[];
      const o = [];
      
      for(const n of p) {
        for(let i=0;i<=10;i++) {
          const t = n+(12*i);
          if(t < 128) o.push(t);
        }
      }
      o.sort((a,b) => a-b);
      return o; 
    },
    actualNotes():number[][] {
      const s = PCS12.parseForte(this.forte);
      if(!s) return [];
      const k = s?.getK()??0;
      return this.sequence.map(
        (n:number) => {
          const bits = Math.abs(n).toString(2).split('').reverse();
          const sign = Math.sign(n);
          return this.scale
            .filter(
              (_, idx) => {
                const bitIndex = (sign*(idx-this.octave*k));
                
                return bitIndex >=0 && bitIndex < bits.length && bits[bitIndex] == "1";
              }
            );

        });
    },
  },
  methods: {
    getDraftData(): PresetData {
      return normalizePresetData({
        bpm: this.bpm,
        numerator: this.numerator,
        denominator: this.denominator,
        waveform: this.waveform,
        sequenceInput: this.sequenceInput,
        octave: this.octave,
        lengthFactor: this.lengthFactor,
        forte: this.forte,
      });
    },
    applyDraftData(data: PresetData) {
      const normalized = clonePresetData(normalizePresetData(data));
      this.bpm = normalized.bpm;
      this.numerator = normalized.numerator;
      this.denominator = normalized.denominator;
      this.waveform = normalized.waveform;
      this.sequenceInput = normalized.sequenceInput;
      this.octave = normalized.octave;
      this.lengthFactor = normalized.lengthFactor;
      this.forte = normalized.forte;
      this.applyRealtimeSettings();
    },
    applyRealtimeSettings() {
      if (this.loop) {
        this.loop.interval = this.quant.toString() + 's';
      }
      Tone.getTransport().bpm.value = this.bpm;
      Tone.getTransport().timeSignature = [this.numerator, this.denominator];
      this.updateSynth();
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
    async playNoteWithMidi(note: number, velocity: number, duration: Tone.Unit.Seconds, when: number) {
      if (this.midiOutput!!) {
          const noteOn = [0x90 + this.midiChannel-1, note, Math.round(velocity * 127)];
          const noteOff = [0x80 + this.midiChannel-1, note, 0];

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
    updateSynth() {
      const waveformType = 
        this.waveform === "triangle" ? 'triangle' :
        this.waveform === "sawtooth" ? 'sawtooth' :
        this.waveform === "square" ? 'square' : 'sine';

      this.synth.set({
        envelope: {
          attackCurve: 'exponential',
          attack: (this.quant / 2.0).toString() + "s",
          decay: 0,
          releaseCurve: 'exponential',
          release: (this.quant / 2.0).toString() + "s",
          sustain: 1.0
        },
        oscillator: {
          type: waveformType
        }
      });
      
      // Use a small lookAhead for a snappier start
      this.synth.context.lookAhead = 0.05;
    },
    async getMidi():Promise<Midi> {
      const midi = new Midi();
      const track = midi.addTrack();
      track.channel = this.useMidiOutput ? this.midiChannel-1 : 0;
      
      midi.header.setTempo(this.bpm);
      for(let i=0;i < this.actualNotes.length;i++) {
        const notes = this.actualNotes[i];
        const vel = 0.5*Math.sqrt(1.0/notes.length);

        let dur = 1;
        while(this.actualNotes[(i+dur)%this.actualNotes.length].length == 0) dur++;
        
        for(let note of notes) {
          track.addNote({
            midi: note,
            time: i*this.quant,
            duration: dur*this.quant*this.lengthFactor/100.0,
            velocity: vel 
          });
        };
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
      await navigator.clipboard.writeText(encodeURI(`https://ncg777.github.io/gaterunner/?bpm=${this.bpm}&numerator=${this.numerator}&denominator=${this.denominator}&waveform=${this.waveform}&octave=${this.octave}&forte=${this.forte}&lengthFactor=${this.lengthFactor}&sequence=${this.sequenceInput}`));
      window.alert("URL copied to clipboard.");
    },
    async startSequencer() {
      if(this.isRunning) return;
      this.isRunning = true;
      this.counter = 0;
      await Tone.start();
      this.applyRealtimeSettings();
      console.log('Audio context started');
      const that = this;
      if(this.loop == null) {
        this.loop = new Tone.Loop(async (_) => {
          that.playNote(_, that.counter);
          that.counter = (that.counter + 1) % that.actualNotes.length; 
        }, this.quant.toString()+"s");
      }
      
      // Start loop and transport immediately; schedule from now without artificial offsets
      this.loop.start(0);
      Tone.getTransport().seconds = 0;
      Tone.getTransport().start();
    },
    stopSequencer() {
      if(!this.isRunning) return;
      this.isRunning = false;
      this.loop?.stop();
      Tone.getTransport().stop();
      Tone.getTransport().seconds=0;
      console.log('Stopped');
    },
    
    async playNote(when : Tone.Unit.Seconds, counter:number) {
      const arr = this.actualNotes[counter%this.actualNotes.length];
      
      // Always update activeNotes, even if empty
      this.activeNotes = [...arr];
      console.log('Playing notes:', this.activeNotes);
      
      if (arr.length > 0 && this.synth) {
        let dur = 1;
        while(this.actualNotes[(counter+dur)%this.actualNotes.length].length == 0) dur++;
        
        const vel = 0.5*Math.sqrt(1.0/arr.length);
        
        if (this.useMidiOutput) {
          for (const note of arr) {
            this.playNoteWithMidi(note, vel, dur * this.quant * this.lengthFactor / 100.0, when);
          }
        } else if (this.synth) {
          this.synth.triggerAttackRelease(
            arr.map(note => Tone.Frequency(note, 'midi').toFrequency()),
            (dur * this.quant * this.lengthFactor / 100.0).toString() + "s",
            when,
            vel
          );
        }
      }
    },

    async downloadMIDI() {
      const data = (await this.getMidi()).toArray();
      const blob = new Blob([Uint8Array.from(data)], { type: 'audio/midi' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `GateRunner-${this.formattedDate().toString()}-${this.forte}-${this.bpm}bpm-${this.numerator}on${this.denominator}timesig.mid`;
      a.click();

      // Clean up the URL object
      URL.revokeObjectURL(url);
    }
  },
  async beforeMount() {
      await PCS12.init();
      const arr = Array.from(PCS12.getChords()).map(c => c.toString());
      arr.sort(PCS12.ReverseForteStringComparator);
      this.allChords=arr;
      this.applyRealtimeSettings();
  },
  beforeUnmount() {
    this.stopSequencer();
    this.synth.dispose();
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