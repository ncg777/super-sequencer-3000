<template>
  <v-app class="app-shell">
    <v-main class="workspace-main">
      <div ref="controlDeck" class="control-deck">
        <div class="control-deck-header">
          <v-btn
            class="control-deck-toggle"
            icon
            variant="flat"
            size="small"
            color="surface"
            :title="controlDeckCollapsed ? 'Show controls' : 'Hide controls'"
            @click="toggleControlDeck"
          >
            <v-icon>{{ controlDeckCollapsed ? 'mdi-chevron-down' : 'mdi-chevron-up' }}</v-icon>
          </v-btn>

          <div class="brand-group">
            <h1 class="app-title">GateRunner</h1>
            <span class="version-pill">v{{ appVersion }}</span>
          </div>

          <div class="header-actions">
            <v-btn
              class="header-icon-btn play-toggle-btn"
              icon
              variant="flat"
              size="small"
              :color="isRunning ? 'error' : 'success'"
              :title="isRunning ? 'Stop' : 'Play'"
              :disabled="isStarting"
              @click="toggleSequencer"
            >
              <v-icon>{{ isRunning ? 'mdi-stop' : 'mdi-play' }}</v-icon>
            </v-btn>
            <v-menu v-model="transportMenuOpen" location="bottom end" :close-on-content-click="false">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  class="header-icon-btn"
                  icon
                  variant="tonal"
                  color="primary"
                  size="small"
                  title="Global actions"
                >
                  <v-icon>mdi-dots-vertical</v-icon>
                </v-btn>
              </template>
              <v-list density="compact" class="transport-action-menu">
                <v-list-item
                  title="Download MIDI"
                  prepend-icon="mdi-music-note"
                  :disabled="isExporting"
                  @click="downloadMIDI"
                />
                <v-list-item
                  :title="isExporting && exportFormat === 'wav' ? 'Rendering WAV...' : 'Download WAV'"
                  prepend-icon="mdi-waveform"
                  :disabled="isExporting"
                  @click="downloadWAV"
                />
                <v-divider class="my-1" />
                <v-list-subheader>MIDI</v-list-subheader>
                <v-list-item class="midi-menu-item" :ripple="false">
                  <template #prepend>
                    <v-icon>mdi-midi-port</v-icon>
                  </template>
                  <template #default>
                    <v-switch
                      v-model="useMidiOutput"
                      label="MIDI Output"
                      hide-details
                      density="compact"
                      inset
                      class="midi-menu-switch"
                      @update:modelValue="updateMidiMode"
                    />
                  </template>
                </v-list-item>
                <v-list-item v-if="useMidiOutput" class="midi-menu-item" :ripple="false">
                  <template #prepend>
                    <v-icon>mdi-usb-port</v-icon>
                  </template>
                  <template #default>
                    <v-select
                      v-model="selectedMidiDevice"
                      :items="midiDevices"
                      label="MIDI Device"
                      hide-details
                      density="compact"
                      variant="outlined"
                      class="midi-menu-device-select"
                      @update:modelValue="updateMidiDevice"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-menu>

            <v-btn
              icon
              variant="text"
              size="small"
              class="toolbar-icon-btn header-icon-btn"
              title="Help"
              @click="showHelp = true"
            >
              <v-icon>mdi-help-circle</v-icon>
            </v-btn>
          </div>
        </div>

        <PresetManager
          ref="presetManager"
          :initial-library="initialPresetLibrary"
          :initial-dirty="isDirty"
          :draft-data="getDraftData()"
          :apply-draft-data="applyDraftData"
          :confirm-discard-changes="confirmDiscardChanges"
          :ask-for-confirmation="askForConfirmation"
          :ask-for-text-input="askForTextInput"
          :show-notice="showNotice"
          @dirty-change="handlePresetDirtyChange"
        />

        <div v-show="!controlDeckCollapsed" class="toolbar-panel dependent-settings-panel">
          <div class="dependent-settings-row">
            <div class="forte-control-top">
              <v-autocomplete
                label="Forte number"
                v-model="forte"
                :items="allChords"
                placeholder="Forte number..."
                hide-details
                density="compact"
                variant="outlined"
                prepend-inner-icon="mdi-piano"
                @update:modelValue="handleDraftChange"
              />
            </div>
            <div class="tempo-control">
              <EditableSlider
                :label="'Tempo (' + bpm + ' BPM)'"
                :min="1"
                :step="1"
                :max="499"
                v-model="bpm"
                @update:modelValue="handleDraftChange"
              />
            </div>
          </div>
        </div>

        <div v-show="!controlDeckCollapsed" class="toolbar-panel track-strip-panel">
          <TrackStrip
            :tracks="tracks"
            :selected-track-id="selectedTrackId"
            :track-mix-states="trackMixStates"
            @add-track="addTrack"
            @select-track="handleTrackSelection"
            @track-name-input="handleTrackNameInput"
            @commit-track-name="commitTrackName"
            @toggle-muted="toggleTrackMuted"
            @toggle-soloed="toggleTrackSoloed"
            @remove-track="removeTrack"
          />
        </div>
      </div>

      <div class="control-deck-spacer" :style="{ height: `${controlDeckHeight + 12}px` }"></div>

      <EditorSurface
        :track="currentTrack"
        :reverb="reverbSettings"
        @track-change="handleTrackDraftChange"
        @reverb-change="handleReverbDraftChange"
      />

      <ExportProgressDialog
        :visible="isExporting"
        :format="exportFormat"
        :progress="exportProgress"
        :status="exportStatus"
      />

      <v-dialog v-model="showConfirmDialog" max-width="460px" persistent>
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">{{ confirmDialogTitle }}</v-card-title>
          <v-card-text>{{ confirmDialogMessage }}</v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="resolveConfirmDialog(false)">Cancel</v-btn>
            <v-btn color="error" @click="resolveConfirmDialog(true)">{{ confirmDialogConfirmLabel }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showInputDialog" max-width="460px" persistent>
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">{{ inputDialogTitle }}</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="inputDialogValue"
              :label="inputDialogLabel"
              density="comfortable"
              variant="outlined"
              autofocus
              @keydown.enter.prevent="resolveInputDialog(true)"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="resolveInputDialog(false)">Cancel</v-btn>
            <v-btn color="primary" @click="resolveInputDialog(true)" :disabled="inputDialogValue.trim().length === 0">{{ inputDialogConfirmLabel }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <HelpDialog v-model="showHelp" :app-version="appVersion" />
    </v-main>
    <v-snackbar
      v-model="showPlaybackError"
      :timeout="5000"
      color="error"
      location="top"
    >
      {{ playbackErrorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showPlaybackError = false">Close</v-btn>
      </template>
    </v-snackbar>

    <v-snackbar
      v-model="showAppNotice"
      :timeout="3000"
      :color="appNoticeColor"
      location="top"
    >
      {{ appNoticeMessage }}
      <template #actions>
        <v-btn variant="text" @click="showAppNotice = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-app>
</template>

<script lang="ts">
import pkg from '../package.json';
const appVersion = pkg.version;
import { defineComponent, markRaw } from 'vue';
import EditableSlider from './components/EditableSlider.vue';
import EditorSurface from './components/EditorSurface.vue';
import ExportProgressDialog from './components/ExportProgressDialog.vue';
import HelpDialog from './components/HelpDialog.vue';
import PresetManager from './components/PresetManager.vue';
import TrackStrip from './components/TrackStrip.vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from 'ultra-mega-enumerator';
import {
  createReverbAudioChain,
  disposeReverbAudioChain,
  updateReverbAudioChain,
  type ReverbAudioChain,
} from './audio/reverb';
import { encodeWavFromChannels } from './audio/wav';
import {
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  arePresetDataEqual,
  buildDraftFromUrl,
  clonePresetData,
  clonePresetTrackData,
  getSelectedPreset,
  hasUrlPresetOverrides,
  loadPresetLibrary,
  normalizePresetData,
  normalizePresetTrackData,
  sanitizeTrackName,
  type EchoDelayValue,
  type PresetData,
  type PresetLibrary,
  type PresetReverbData,
  type PresetTrackData,
} from './presets';

interface TrackAudioChain {
  synth: Tone.PolySynth;
  filter: Tone.Filter;
  limiterGain: Tone.Gain;
  limiter: Tone.WaveShaper;
  tremolo: Tone.Tremolo;
  vibrato: Tone.Vibrato;
  echo: Tone.FeedbackDelay | Tone.PingPongDelay;
  echoPingPong: boolean;
  maxDelay: number;
  dryGain: Tone.Gain;
  reverbSend: Tone.Gain;
  outputGain: Tone.Gain;
  mixGain: Tone.Gain;
}

const ENVELOPE_SMOOTHING_SECONDS = 0.005;

export interface TrackMixState {
  muted: boolean;
  soloed: boolean;
}

function buildInitialState() {
  const presetLibrary = loadPresetLibrary();
  const selectedPreset = getSelectedPreset(presetLibrary);
  const draft = buildDraftFromUrl(window.location.search, selectedPreset.data);
  const selectedTrackId = draft.tracks[0]?.id ?? null;

  return {
    presetLibrary,
    selectedPresetId: selectedPreset.id,
    selectedPresetFolderId: selectedPreset.folderId,
    selectedTrackId,
    isDirty: hasUrlPresetOverrides(window.location.search) || !arePresetDataEqual(draft, selectedPreset.data),
    draft,
  };
}

const initialState = buildInitialState();

export default defineComponent({
  name: 'App',
  components: {
    EditableSlider,
    EditorSurface,
    ExportProgressDialog,
    HelpDialog,
    PresetManager,
    TrackStrip,
  },
  data() {
    return {
      bpm: initialState.draft.bpm,
      forte: initialState.draft.forte,
      tracks: initialState.draft.tracks.map((track) => clonePresetTrackData(track)) as PresetTrackData[],
      trackMixStates: {} as Record<string, TrackMixState>,
      selectedTrackId: initialState.selectedTrackId as string | null,
      reverbEnabled: initialState.draft.reverb.enabled,
      reverbDecay: initialState.draft.reverb.decay,
      reverbPreDelay: initialState.draft.reverb.preDelay,
      reverbDry: initialState.draft.reverb.dry,
      reverbWet: initialState.draft.reverb.wet,
      reverbLowCut: initialState.draft.reverb.lowCut,
      reverbHighCut: initialState.draft.reverb.highCut,
      allChords: [] as string[],
      isRunning: false,
      isStarting: false,
      playbackErrorMessage: '',
      showPlaybackError: false,
      audioContextResumeHandler: null as (() => void) | null,
      trackLoops: {} as Record<string, Tone.Part<{ time: number; step: number }>>,
      showHelp: false,
      trackSynths: {} as Record<string, TrackAudioChain>,
      reverbChain: null as ReverbAudioChain | null,
      useMidiOutput: false,
      midiDevices: [] as string[],
      selectedMidiDevice: null as string | null,
      midiAccess: null as MIDIAccess | null,
      midiOutput: null as MIDIOutput | null,
      appVersion: appVersion,
      activeNotes: [] as number[],
      initialPresetLibrary: initialState.presetLibrary as PresetLibrary,
      isDirty: initialState.isDirty,
      showConfirmDialog: false,
      confirmDialogTitle: 'Confirm',
      confirmDialogMessage: '',
      confirmDialogConfirmLabel: 'Confirm',
      confirmDialogResolver: null as ((value: boolean) => void) | null,
      showInputDialog: false,
      inputDialogTitle: 'Input',
      inputDialogLabel: 'Value',
      inputDialogConfirmLabel: 'Save',
      inputDialogValue: '',
      inputDialogResolver: null as ((value: string | null) => void) | null,
      showAppNotice: false,
      appNoticeMessage: '',
      appNoticeColor: 'info',
      isExporting: false,
      exportFormat: null as 'midi' | 'wav' | null,
      exportProgress: 0,
      exportStatus: '',
      transportMenuOpen: false,
      controlDeckHeight: 0,
      controlDeckCollapsed: false,
      controlDeckResizeObserver: null as ResizeObserver | null,
      rebuildTrackLoopsTimer: null as number | null,
    };
  },
  computed: {
    currentTrack(): PresetTrackData | null {
      return this.tracks.find((track) => track.id === this.selectedTrackId) ?? this.tracks[0] ?? null;
    },
    reverbSettings() {
      return {
        enabled: this.reverbEnabled,
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        dry: this.reverbDry,
        wet: this.reverbWet,
        lowCut: this.reverbLowCut,
        highCut: this.reverbHighCut,
      };
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
    getTrackBarSeconds(track: PresetTrackData): number {
      return track.numerator * (60.0 / this.bpm);
    },
    getTrackDelaySeconds(track: PresetTrackData): number {
      return track.delay * this.getTrackBarSeconds(track) + track.phase * this.getTrackQuant(track);
    },
    getTrackPatternDuration(track: PresetTrackData, trackNotes: number[][]): number {
      return trackNotes.length * this.getTrackQuant(track);
    },
    getTrackTotalDuration(track: PresetTrackData, trackNotes: number[][]): number {
      return this.getTrackDelaySeconds(track) + track.repeats * this.getTrackPatternDuration(track, trackNotes);
    },
    getLoopDurationSecondsFromTrackLengths(): number {
      const entries = this.allTrackActualNotes.filter((entry) => entry.notes.length > 0);
      if (entries.length === 0) {
        return 1;
      }

      const maxDuration = Math.max(
        ...entries.map((entry) => this.getTrackTotalDuration(entry.track, entry.notes)),
      );

      return Math.max(this.getTrackQuant(entries[0].track), maxDuration);
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
    handleTrackSelection(nextTrackId: string | null) {
      if (!nextTrackId) {
        return;
      }

      this.selectedTrackId = nextTrackId;
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
        ...DEFAULT_PRESET_TRACK_DATA,
        id: undefined,
        name: this.buildUniqueTrackName(`Track ${this.tracks.length + 1}`),
        sequenceInput: '',
        midiChannel: this.nextTrackChannel(),
      }, this.tracks.length);

      this.tracks = [...this.tracks, nextTrack];
      this.trackMixStates = {
        ...this.trackMixStates,
        [nextTrack.id]: { muted: false, soloed: false },
      };
      this.selectedTrackId = nextTrack.id;
      this.handleDraftChange();
    },
    handleTrackNameInput(trackId: string, nextName: string) {
      this.tracks = this.tracks.map((track) => track.id === trackId ? { ...track, name: nextName } : track);
      this.refreshDirtyState();
    },
    commitTrackName(trackId: string) {
      const track = this.tracks.find((entry) => entry.id === trackId);
      if (!track) {
        return;
      }

      const nextName = this.buildUniqueTrackName(track.name, track.id);
      this.tracks = this.tracks.map((entry) => entry.id === trackId ? { ...entry, name: nextName } : entry);
      this.refreshDirtyState();
    },
    async removeTrack(trackId: string) {
      const trackToRemove = this.tracks.find((track) => track.id === trackId);
      if (!trackToRemove || this.tracks.length <= 1) {
        return;
      }

      const confirmed = await this.askForConfirmation('Delete Track', `Delete track "${trackToRemove.name}"?`, 'Delete');
      if (!confirmed) {
        return;
      }

      const removedIndex = this.tracks.findIndex((track) => track.id === trackId);
      const nextTracks = this.tracks.filter((track) => track.id !== trackId);
      this.tracks = nextTracks;
      const nextTrackMixStates: Record<string, TrackMixState> = {};
      for (const track of nextTracks) {
        const state = this.trackMixStates[track.id];
        if (state) {
          nextTrackMixStates[track.id] = state;
        }
      }
      this.trackMixStates = nextTrackMixStates;
      if (this.selectedTrackId === trackId) {
        this.selectedTrackId = nextTracks[Math.max(0, removedIndex - 1)]?.id ?? nextTracks[0]?.id ?? null;
      }
      this.handleDraftChange();
    },
    getTrackMixState(trackId: string): TrackMixState {
      return this.trackMixStates[trackId] ?? { muted: false, soloed: false };
    },
    isTrackMuted(trackId: string): boolean {
      return this.getTrackMixState(trackId).muted;
    },
    isTrackSoloed(trackId: string): boolean {
      return this.getTrackMixState(trackId).soloed;
    },
    isTrackAudible(trackId: string): boolean {
      const state = this.getTrackMixState(trackId);
      return !state.muted && (!this.tracks.some((track) => this.isTrackSoloed(track.id)) || state.soloed);
    },
    applyTrackMixState(track: PresetTrackData, chain: TrackAudioChain) {
      chain.mixGain.gain.value = this.isTrackAudible(track.id) ? 1 : 0;
    },
    updateTrackMixStates() {
      for (const track of this.tracks) {
        const chain = this.trackSynths[track.id];
        if (chain) {
          this.applyTrackMixState(track, chain);
        }
      }
    },
    toggleTrackMuted(trackId: string) {
      const state = this.getTrackMixState(trackId);
      this.trackMixStates = {
        ...this.trackMixStates,
        [trackId]: { ...state, muted: !state.muted },
      };
      this.updateTrackMixStates();
    },
    toggleTrackSoloed(trackId: string) {
      const state = this.getTrackMixState(trackId);
      this.trackMixStates = {
        ...this.trackMixStates,
        [trackId]: { ...state, soloed: !state.soloed },
      };
      this.updateTrackMixStates();
    },
    async removeCurrentTrack() {
      const currentTrack = this.currentTrack;
      if (!currentTrack || this.tracks.length <= 1) {
        return;
      }

      await this.removeTrack(currentTrack.id);
    },
    async renameCurrentTrack() {
      const currentTrack = this.currentTrack;
      if (!currentTrack) {
        return;
      }

      const suggestedName = this.buildUniqueTrackName(currentTrack.name, currentTrack.id);
      const requestedName = await this.askForTextInput({
        title: `Rename ${currentTrack.name}`,
        label: 'Track name',
        initialValue: suggestedName,
        confirmLabel: 'Rename',
      });
      if (requestedName === null) {
        return;
      }

      const nextName = this.buildUniqueTrackName(requestedName, currentTrack.id);
      if (nextName === currentTrack.name) {
        return;
      }

      this.tracks = this.tracks.map((track) => track.id === currentTrack.id ? { ...track, name: nextName } : track);
      this.handleDraftChange();
    },
    showNotice(message: string, color: 'info' | 'success' | 'warning' | 'error' = 'info') {
      this.appNoticeMessage = message;
      this.appNoticeColor = color;
      this.showAppNotice = true;
    },
    askForConfirmation(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
      this.confirmDialogTitle = title;
      this.confirmDialogMessage = message;
      this.confirmDialogConfirmLabel = confirmLabel;
      this.showConfirmDialog = true;

      return new Promise((resolve) => {
        this.confirmDialogResolver = resolve;
      });
    },
    resolveConfirmDialog(value: boolean) {
      const resolver = this.confirmDialogResolver;
      this.confirmDialogResolver = null;
      this.showConfirmDialog = false;
      resolver?.(value);
    },
    askForTextInput(options: { title: string; label: string; initialValue: string; confirmLabel?: string }): Promise<string | null> {
      this.inputDialogTitle = options.title;
      this.inputDialogLabel = options.label;
      this.inputDialogValue = options.initialValue;
      this.inputDialogConfirmLabel = options.confirmLabel ?? 'Save';
      this.showInputDialog = true;

      return new Promise((resolve) => {
        this.inputDialogResolver = resolve;
      });
    },
    resolveInputDialog(submit: boolean) {
      const resolver = this.inputDialogResolver;
      this.inputDialogResolver = null;
      const value = submit ? this.inputDialogValue.trim() : null;
      this.showInputDialog = false;
      resolver?.(value && value.length > 0 ? value : null);
      this.inputDialogValue = '';
    },
    handleTrackDraftChange(nextTrack: PresetTrackData) {
      const previousTrack = this.currentTrack ? clonePresetTrackData(this.currentTrack) : null;
      const normalizedTrack = normalizePresetTrackData(nextTrack);
      this.tracks = this.tracks.map((track) => track.id === normalizedTrack.id ? normalizedTrack : track);
      const updatedTrack = this.currentTrack;
      this.refreshDirtyState();

      if (!updatedTrack) {
        return;
      }

      if (this.isRunning && previousTrack && this.didTrackTimingChange(previousTrack, updatedTrack)) {
        this.scheduleTrackLoopRebuild();
      }

      this.updateSynths(updatedTrack.id, false);
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
    getTrackVelocity(notes: number[], velocityMultiplier: number): number {
      if (notes.length === 0) {
        return 0;
      }
      return Math.min(1, 0.5 * Math.sqrt(1.0 / notes.length) * velocityMultiplier);
    },
    midiToFrequency(midi: number): number {
      return Tone.Frequency(midi, 'midi').toFrequency();
    },
    dbToGain(db: number): number {
      return Math.pow(10, db / 20);
    },
    clampNormalRange(value: number): number {
      return Math.max(0, Math.min(1, value));
    },
    didTrackTimingChange(previous: PresetTrackData, next: PresetTrackData): boolean {
      return previous.numerator !== next.numerator
        || previous.denominator !== next.denominator
        || previous.phase !== next.phase
        || previous.delay !== next.delay
        || previous.repeats !== next.repeats
        || previous.sequenceInput !== next.sequenceInput
        || previous.octave !== next.octave;
    },
    dbToWetMix(db: number): number {
      return this.clampNormalRange(this.dbToGain(db));
    },
    setWavExportProgress(progress: number, status: string) {
      this.exportProgress = progress < 0 ? -1 : Math.max(0, Math.min(100, Math.round(progress)));
      this.exportStatus = status;
    },
    startExport(format: 'midi' | 'wav', status: string) {
      this.isExporting = true;
      this.exportFormat = format;
      this.exportProgress = 0;
      this.exportStatus = status;
    },
    finishExport() {
      this.isExporting = false;
      this.exportFormat = null;
      this.exportProgress = 0;
      this.exportStatus = '';
    },
    updateControlDeckHeight() {
      const deck = this.$refs.controlDeck as HTMLElement | undefined;
      if (!deck) {
        return;
      }

      this.controlDeckHeight = Math.ceil(deck.getBoundingClientRect().height);
    },
    toggleControlDeck() {
      this.controlDeckCollapsed = !this.controlDeckCollapsed;
      this.$nextTick(() => {
        this.updateControlDeckHeight();
      });
    },
    getRenderDurationSeconds(): number {
      const echoTrail = Math.max(
        0,
        ...this.tracks.map((track) => track.echoEnabled ? this.getEchoDelaySeconds(track.echoDelay) * (1 + track.echoFeedback * 8) : 0),
      );
      const releaseTrail = Math.max(0, ...this.tracks.map((track) => track.release));
      const hasReverbSend = this.reverbEnabled && this.reverbWet > -96 && this.tracks.some((track) => track.reverbWet > -96);
      const reverbTrail = hasReverbSend ? this.reverbPreDelay + this.reverbDecay : 0;
      return this.getLoopDurationSecondsFromTrackLengths() + Math.max(2, releaseTrail, echoTrail, reverbTrail);
    },
    async renderMixWav(): Promise<Uint8Array> {
      this.setWavExportProgress(8, 'Preparing render...');
      await this.$nextTick();

      const loopDuration = this.getLoopDurationSecondsFromTrackLengths();
      const renderDuration = this.getRenderDurationSeconds();
      const allTrackNotes = this.allTrackActualNotes;
      this.setWavExportProgress(22, 'Scheduling tracks...');

      let renderProgressTimer: number | null = null;
      this.exportProgress = -1;
      this.exportStatus = 'Rendering audio...';

      renderProgressTimer = window.setInterval(() => {
        if (this.exportProgress < 0) {
          return;
        }
        if (this.exportProgress < 85) {
          this.exportProgress += 1;
        }
      }, 120);

      const liveReverbChain = this.reverbChain;
      const liveTrackSynths = this.trackSynths;
      const rendered = await Tone.Offline(() => {
        this.reverbChain = null;
        this.trackSynths = {};
        this.getOrCreateReverbChain();

        for (const entry of allTrackNotes) {
          if (entry.notes.length === 0) {
            continue;
          }

          const trackQuant = this.getTrackQuant(entry.track);
          const trackPeriod = entry.notes.length * trackQuant;
          if (trackPeriod <= 0) {
            continue;
          }

          const delaySeconds = this.getTrackDelaySeconds(entry.track);

          const chain = this.createTrackAudioChain(entry.track.echoPingPong, this.getTrackEchoMaxDelay(entry.track));
          this.trackSynths[`offline-${entry.track.id}`] = chain;
          this.updateTrackChainSettings(entry.track, chain);

          for (let repeat = 0; repeat < entry.track.repeats; repeat += 1) {
            const loopStart = delaySeconds + repeat * trackPeriod;
            for (let i = 0; i < entry.notes.length; i += 1) {
              const notes = entry.notes[i];
              if (notes.length === 0) {
                continue;
              }

              const eventTime = loopStart + (i * trackQuant);
              if (eventTime >= loopDuration) {
                continue;
              }

              const durSteps = this.getTrackStepDuration(entry.notes, i);
              const duration = durSteps * trackQuant * entry.track.lengthFactor / 100.0;
              const velocity = this.getTrackVelocity(notes, entry.track.velocityMultiplier);
              this.scheduleFilterEnvelope(entry.track, notes, eventTime, duration, chain.filter);

              chain.synth.triggerAttackRelease(
                this.getTrackPlaybackFrequencies(entry.track, notes),
                duration,
                eventTime,
                velocity,
              );
            }
          }
        }
        this.reverbChain = liveReverbChain;
        this.trackSynths = liveTrackSynths;
      }, renderDuration);

      if (renderProgressTimer !== null) {
        window.clearInterval(renderProgressTimer);
      }

      this.setWavExportProgress(90, 'Encoding WAV...');
      await this.$nextTick();

      const audioBuffer = (rendered as { get?: () => AudioBuffer }).get
        ? (rendered as { get: () => AudioBuffer }).get()
        : (rendered as unknown as AudioBuffer);

      const channels: Float32Array[] = [];
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
        channels.push(audioBuffer.getChannelData(channel));
      }

      return encodeWavFromChannels(channels, audioBuffer.sampleRate);
    },
    getDraftData(): PresetData {
      return normalizePresetData({
        bpm: this.bpm,
        forte: this.forte,
        tracks: this.tracks.map((track) => clonePresetTrackData(track)),
        reverb: {
          enabled: this.reverbEnabled,
          decay: this.reverbDecay,
          preDelay: this.reverbPreDelay,
          dry: this.reverbDry,
          wet: this.reverbWet,
          lowCut: this.reverbLowCut,
          highCut: this.reverbHighCut,
        },
      });
    },
    applyDraftData(data: PresetData) {
      const normalized = clonePresetData(normalizePresetData(data));
      this.bpm = normalized.bpm;
      this.forte = normalized.forte;
      this.reverbEnabled = normalized.reverb.enabled;
      this.reverbDecay = normalized.reverb.decay;
      this.reverbPreDelay = normalized.reverb.preDelay;
      this.reverbDry = normalized.reverb.dry;
      this.reverbWet = normalized.reverb.wet;
      this.reverbLowCut = normalized.reverb.lowCut;
      this.reverbHighCut = normalized.reverb.highCut;

      const fallbackTrackId = normalized.tracks[0]?.id ?? null;
      const preferredTrackId = normalized.tracks.some((track) => track.id === this.selectedTrackId)
        ? this.selectedTrackId
        : fallbackTrackId;
      this.tracks = normalized.tracks.map((track) => clonePresetTrackData(track));
      this.trackMixStates = {};
      this.selectedTrackId = preferredTrackId;
      this.applyRealtimeSettings();
    },
    applyRealtimeSettings(options: { rebuildLoops?: boolean; createMissingChains?: boolean } = {}) {
      const rebuildLoops = options.rebuildLoops ?? true;
      const createMissingChains = options.createMissingChains ?? this.isRunning;
      Tone.getTransport().bpm.value = this.bpm;
      const signatureTrack = this.currentTrack ?? this.tracks[0];
      if (signatureTrack) {
        Tone.getTransport().timeSignature = [signatureTrack.numerator, signatureTrack.denominator];
      }
      this.updateSynths(undefined, createMissingChains);

      if (this.isRunning && rebuildLoops) {
        this.scheduleTrackLoopRebuild();
      }
    },
    refreshDirtyState() {
      const manager = this.$refs.presetManager as { syncDirtyState?: () => void } | undefined;
      manager?.syncDirtyState?.();
    },
    handlePresetDirtyChange(nextDirty: boolean) {
      this.isDirty = nextDirty;
    },
    handleDraftChange() {
      this.applyRealtimeSettings();
      this.refreshDirtyState();
    },
    handleReverbDraftChange(nextReverb: PresetReverbData) {
      this.reverbEnabled = nextReverb.enabled;
      this.reverbDecay = nextReverb.decay;
      this.reverbPreDelay = nextReverb.preDelay;
      this.reverbDry = nextReverb.dry;
      this.reverbWet = nextReverb.wet;
      this.reverbLowCut = nextReverb.lowCut;
      this.reverbHighCut = nextReverb.highCut;
      this.updateReverbChain();
      for (const track of this.tracks) {
        const chain = this.trackSynths[track.id];
        if (chain) {
          this.updateTrackChainSettings(track, chain);
        }
      }
      this.refreshDirtyState();
    },
    async confirmDiscardChanges(actionLabel: string): Promise<boolean> {
      if (!this.isDirty) {
        return true;
      }

      return this.askForConfirmation('Unsaved Changes', `You have unsaved changes. ${actionLabel}?`, 'Continue');
    },
    currentPresetFilenamePart() {
      const manager = this.$refs.presetManager as { currentPreset?: { name?: string } | null } | undefined;
      return (manager?.currentPreset?.name ?? 'preset').replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'preset';
    },
    formattedDate() {
      return (timestamp => `${new Date(timestamp).getUTCFullYear()}${String(new Date(timestamp).getUTCMonth() + 1).padStart(2, '0')}${String(new Date(timestamp).getUTCDate()).padStart(2, '0')}T${String(new Date(timestamp).getUTCHours()).padStart(2, '0')}${String(new Date(timestamp).getUTCMinutes()).padStart(2, '0')}${String(new Date(timestamp).getUTCSeconds()).padStart(2, '0')}Z`)(Date.now());
    },
    async initializeMidi() {
      try {
        const access = await navigator.requestMIDIAccess();
        this.midiAccess = access;
        
        this.midiDevices = Array.from(access.outputs.values()).map(output => output.name!);
        this.$nextTick(() => {
          this.updateControlDeckHeight();
        });
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

      this.$nextTick(() => {
        this.updateControlDeckHeight();
      });
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
    getOrCreateReverbChain(): ReverbAudioChain {
      if (this.reverbChain) {
        return this.reverbChain as ReverbAudioChain;
      }

      this.reverbChain = createReverbAudioChain({
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        lowCutFrequency: this.midiToFrequency(this.reverbLowCut),
        highCutFrequency: this.midiToFrequency(this.reverbHighCut),
      });
      return this.reverbChain as ReverbAudioChain;
    },
    getTrackEchoMaxDelay(track: PresetTrackData): number {
      return Math.max(1, this.getEchoDelaySeconds(track.echoDelay));
    },
    createTrackAudioChain(echoPingPong = true, maxDelay = 1): TrackAudioChain {
      const synth = markRaw(new Tone.PolySynth(Tone.Synth));
      const filter = markRaw(new Tone.Filter());
      const limiterGain = markRaw(new Tone.Gain(1));
      const limiter = markRaw(new Tone.WaveShaper((value) => Math.tanh(value)));
      const vibrato = markRaw(new Tone.Vibrato());
      const tremolo = markRaw(new Tone.Tremolo());
      const echo = markRaw(echoPingPong ? new Tone.PingPongDelay({ maxDelay }) : new Tone.FeedbackDelay({ maxDelay }));
      const outputGain = markRaw(new Tone.Gain(1));
      const mixGain = markRaw(new Tone.Gain(1));
      const dryGain = markRaw(new Tone.Gain(1).toDestination());
      const reverbSend = markRaw(new Tone.Gain(0));

      tremolo.start();
      synth.chain(limiterGain, limiter, outputGain, vibrato, tremolo, echo, filter);
      filter.connect(mixGain);
      mixGain.connect(dryGain);
      reverbSend.connect(this.getOrCreateReverbChain().lowCut);
      mixGain.connect(reverbSend);

      return { synth, filter, limiterGain, limiter, tremolo, vibrato, echo, echoPingPong, maxDelay, dryGain, reverbSend, outputGain, mixGain };
    },
    getOrCreateTrackChain(track: PresetTrackData): TrackAudioChain {
      const maxDelay = this.getTrackEchoMaxDelay(track);
      const existing = this.trackSynths[track.id];
      if (existing) {
        if (existing.echoPingPong !== track.echoPingPong || existing.maxDelay < maxDelay) {
          this.disposeTrackChain(existing);
          delete this.trackSynths[track.id];
        } else {
          return existing;
        }
      }

      const chain = this.createTrackAudioChain(track.echoPingPong, maxDelay);
      this.trackSynths[track.id] = chain;
      this.updateTrackChainSettings(track, chain);
      return chain;
    },
    gaussian(harmonic: number, center: number, width: number): number {
      const safeWidth = Math.max(0.001, width);
      return Math.exp(-((harmonic - center) ** 2) / (2 * safeWidth * safeWidth));
    },
    pseudoNoise(harmonic: number): number {
      const raw = Math.sin(harmonic * 12.9898 + 78.233) * 43758.5453123;
      return ((raw - Math.floor(raw)) * 2) - 1;
    },
    getWaveformPartialAmplitude(waveform: string, harmonic: number): number {
      const noisyTail = this.pseudoNoise(harmonic) / Math.sqrt(harmonic);
      if (waveform === 'triangle') {
        if (harmonic % 2 === 0) {
          return 0;
        }
        return (Math.floor(harmonic / 2) % 2 === 0 ? 1 : -1) / (harmonic * harmonic);
      }
      if (waveform === 'sawtooth') {
        return -1 / harmonic;
      }
      if (waveform === 'square') {
        return harmonic % 2 === 0 ? 0 : 1 / harmonic;
      }
      if (waveform === 'helmholtz') {
        return (harmonic === 1 ? 1.35 : 0)
          + (0.78 * this.gaussian(harmonic, 4, 1.15))
          + (0.22 * noisyTail * this.gaussian(harmonic, 10, 3.4));
      }
      if (waveform === 'formant') {
        return (0.45 * this.gaussian(harmonic, 1.5, 0.8))
          + (1.05 * this.gaussian(harmonic, 4.5, 1.3))
          + (0.82 * this.gaussian(harmonic, 9.5, 2))
          + (0.12 * noisyTail * this.gaussian(harmonic, 15, 4));
      }
      if (waveform === 'duct') {
        return (0.6 * this.gaussian(harmonic, 2.2, 0.7))
          + (0.95 * this.gaussian(harmonic, 6.2, 1.4))
          + (0.55 * this.gaussian(harmonic, 12.4, 2.6))
          + (0.18 * noisyTail);
      }
      if (waveform === 'aeolian') {
        return (harmonic === 1 ? 0.55 : 0)
          + (0.38 * Math.abs(noisyTail))
          + (0.65 * this.gaussian(harmonic, 7.5, 3.2))
          + (0.28 * noisyTail * this.gaussian(harmonic, 18, 5.5));
      }
      if (waveform === 'stochastic-bandpass') {
        return (0.16 * noisyTail)
          + (1.15 * this.gaussian(harmonic, 5.5, 1.1))
          + (0.95 * this.gaussian(harmonic, 11.5, 2))
          + (0.4 * Math.sign(noisyTail || 1) * this.gaussian(harmonic, 18, 3.2));
      }
      return harmonic === 1 ? 1 : 0;
    },
    getOscillatorType(track: PresetTrackData): string {
      return track.unisonVoices > 1 ? 'fatcustom' : 'custom';
    },
    getTonewheelPartials(track: PresetTrackData): number[] {
      const partialIndices = [1, 3, 2, 4, 6, 8, 10, 12, 16];
      const maximumPartial = 64;
      const partials = Array.from({ length: maximumPartial }, () => 0);

      const addWaveformHarmonics = (basePartial: number, amplitude: number) => {
        for (let harmonic = 1; basePartial * harmonic <= maximumPartial; harmonic += 1) {
          const harmonicAmplitude = this.getWaveformPartialAmplitude(track.waveform, harmonic);
          if (harmonicAmplitude === 0) {
            continue;
          }
          partials[basePartial * harmonic - 1] += amplitude * harmonicAmplitude;
        }
      };

      partialIndices.forEach((partialIndex, drawbarIndex) => {
        addWaveformHarmonics(partialIndex, track.tonewheelDrawbars[drawbarIndex] / 8);
      });

      const normalizer = Math.max(1, Math.sqrt(partials.reduce((sum, amplitude) => sum + amplitude * amplitude, 0)));
      return partials.map((amplitude) => amplitude / normalizer);
    },
    getTrackPlaybackFrequencies(track: PresetTrackData, notes: number[]): number[] {
      return notes.map((note) => Tone.Frequency(note - 12, 'midi').toFrequency());
    },
    getTrackFilterMidi(track: PresetTrackData, notes: number[] = []): number {
      if (!track.filterEnabled || notes.length === 0 || track.filterKeyFollow === 0) {
        return track.filterFrequency;
      }

      const averageMidi = notes.reduce((sum, note) => sum + note, 0) / notes.length;
      return Math.max(0, Math.min(127, track.filterFrequency + (averageMidi - 69) * track.filterKeyFollow / 100));
    },
    getTrackFilterFrequency(track: PresetTrackData, notes: number[] = []): number {
      return this.midiToFrequency(this.getTrackFilterMidi(track, notes));
    },
    scheduleFilterEnvelope(
      track: PresetTrackData,
      notes: number[],
      when: Tone.Unit.Seconds,
      noteDuration: number,
      filter: Tone.Filter,
    ) {
      const startTime = Tone.Time(when).toSeconds();
      const baseMidi = this.getTrackFilterMidi(track, notes);
      const baseFrequency = this.midiToFrequency(baseMidi);
      filter.frequency.cancelAndHoldAtTime(startTime);

      if (!track.filterEnabled || track.filterEnvelopeAmount === 0) {
        filter.frequency.linearRampToValueAtTime(baseFrequency, startTime + ENVELOPE_SMOOTHING_SECONDS);
        return;
      }

      const gateDuration = Math.max(0, noteDuration);
      const attack = Math.max(track.filterEnvelopeAttack, ENVELOPE_SMOOTHING_SECONDS);
      const decay = Math.max(track.filterEnvelopeDecay, ENVELOPE_SMOOTHING_SECONDS);
      const release = Math.max(track.filterEnvelopeRelease, ENVELOPE_SMOOTHING_SECONDS);
      const gateTime = startTime + gateDuration;
      const attackEnd = startTime + attack;
      const decayEnd = attackEnd + decay;
      const cutoffForLevel = (level: number): number => this.midiToFrequency(
        Math.max(0, Math.min(127, baseMidi + track.filterEnvelopeAmount * level)),
      );
      const peakFrequency = cutoffForLevel(1);
      const sustainFrequency = cutoffForLevel(track.filterEnvelopeSustain);

      filter.frequency.linearRampToValueAtTime(peakFrequency, attackEnd);
      filter.frequency.linearRampToValueAtTime(sustainFrequency, decayEnd);
      filter.frequency.cancelAndHoldAtTime(gateTime);
      filter.frequency.linearRampToValueAtTime(baseFrequency, gateTime + release);
    },
    getEchoDelaySeconds(delay: EchoDelayValue): number {
      const match = delay.match(/^1\/(\d+)([DT])?$/);
      if (!match) {
        return 60 / this.bpm;
      }

      const denominator = Number.parseInt(match[1], 10);
      const modifier = match[2];
      const quarterNoteSeconds = 60 / this.bpm;
      const wholeNoteSeconds = quarterNoteSeconds * 4;
      const modifierRatio = modifier === 'D' ? 1.5 : modifier === 'T' ? 2 / 3 : 1;
      return (wholeNoteSeconds / denominator) * modifierRatio;
    },
    disposeTrackChain(chain: TrackAudioChain) {
      chain.synth.dispose();
      chain.filter.dispose();
      chain.limiterGain.dispose();
      chain.limiter.dispose();
      chain.tremolo.dispose();
      chain.vibrato.dispose();
      chain.echo.dispose();
      chain.dryGain.dispose();
      chain.reverbSend.dispose();
      chain.outputGain.dispose();
      chain.mixGain.dispose();
    },
    updateReverbChain() {
      const chain = this.getOrCreateReverbChain();
      updateReverbAudioChain(chain, {
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        lowCutFrequency: this.midiToFrequency(this.reverbLowCut),
        highCutFrequency: this.midiToFrequency(this.reverbHighCut),
      });
    },
    updateTrackChainSettings(track: PresetTrackData, chain: TrackAudioChain) {
      const oscillatorOptions = {
        type: this.getOscillatorType(track) as Tone.ToneOscillatorType,
        count: track.unisonVoices,
        spread: track.unisonDetune,
        partials: this.getTonewheelPartials(track),
      } as unknown as Tone.PolySynthOptions<Tone.Synth<Tone.SynthOptions>>['options']['oscillator'];

      chain.synth.set({
        envelope: {
          attackCurve: 'exponential',
          attack: Math.max(track.attack, ENVELOPE_SMOOTHING_SECONDS),
          decay: Math.max(track.decay, ENVELOPE_SMOOTHING_SECONDS),
          decayCurve: 'exponential',
          releaseCurve: 'exponential',
          release: Math.max(track.release, ENVELOPE_SMOOTHING_SECONDS),
          sustain: track.sustain,
        },
        oscillator: oscillatorOptions,
      });

      chain.filter.set({
        type: track.filterEnabled ? track.filterType as BiquadFilterType : 'allpass',
        frequency: track.filterEnabled ? this.midiToFrequency(track.filterFrequency) : this.midiToFrequency(127),
        rolloff: track.filterRolloff as -12 | -24 | -48 | -96,
        Q: track.filterQ,
        gain: track.filterGain,
      });
      chain.limiterGain.gain.value = this.dbToGain(track.limiterGain);
      chain.tremolo.set({
        frequency: track.tremoloFrequency,
        depth: this.clampNormalRange(track.tremoloDepth),
        spread: track.tremoloSpread,
        wet: track.tremoloEnabled ? 1 : 0,
      });
      chain.vibrato.set({
        frequency: track.vibratoFrequency,
        depth: this.clampNormalRange(track.vibratoDepth),
        wet: track.vibratoEnabled ? 1 : 0,
      });
      chain.echo.set({
        delayTime: this.getEchoDelaySeconds(track.echoDelay),
        feedback: this.clampNormalRange(track.echoFeedback),
        wet: track.echoEnabled ? this.dbToWetMix(track.echoWet) : 0,
      });
      chain.outputGain.gain.value = this.dbToGain(track.gain);
      this.applyTrackMixState(track, chain);
      chain.dryGain.gain.value = this.dbToGain(this.reverbDry);
      chain.reverbSend.gain.value = this.reverbEnabled ? this.dbToGain(track.reverbWet + this.reverbWet) : 0;
      chain.synth.context.lookAhead = 0.05;
    },
    updateSynths(trackId?: string, createMissingChains = true) {
      const activeTrackIds = new Set(this.tracks.map((track) => track.id));
      for (const [existingTrackId, chain] of Object.entries(this.trackSynths)) {
        if (!activeTrackIds.has(existingTrackId)) {
          this.disposeTrackChain(chain);
          delete this.trackSynths[existingTrackId];
        }
      }

      this.updateReverbChain();

      const tracksToUpdate = trackId
        ? this.tracks.filter((track) => track.id === trackId)
        : this.tracks;

      for (const track of tracksToUpdate) {
        const existing = this.trackSynths[track.id];
        if (!existing && !createMissingChains) {
          continue;
        }
        const chain = existing ?? this.getOrCreateTrackChain(track);
        this.updateTrackChainSettings(track, chain);
      }
    },
    async getMidi(): Promise<Midi> {
      const midi = new Midi();
      
      midi.header.setTempo(this.bpm);
      const totalLoopDuration = this.getLoopDurationSecondsFromTrackLengths();

      for (const entry of this.allTrackActualNotes) {
        const notesByStep = entry.notes;
        if (notesByStep.length === 0) {
          continue;
        }

        const track = midi.addTrack();
        track.channel = entry.track.midiChannel - 1;
        const trackQuant = this.getTrackQuant(entry.track);
        const trackPeriod = notesByStep.length * trackQuant;
        if (trackPeriod <= 0) {
          continue;
        }

        const delaySeconds = this.getTrackDelaySeconds(entry.track);

        for (let repeat = 0; repeat < entry.track.repeats; repeat += 1) {
          const loopStart = delaySeconds + repeat * trackPeriod;
          for (let i = 0; i < notesByStep.length; i += 1) {
            const notes = notesByStep[i];
            if (notes.length === 0) {
              continue;
            }

            const eventTime = loopStart + (i * trackQuant);
            if (eventTime >= totalLoopDuration) {
              continue;
            }

            const dur = this.getTrackStepDuration(notesByStep, i);
            const vel = this.getTrackVelocity(notes, entry.track.velocityMultiplier);

            for (const note of notes) {
              track.addNote({
                midi: note,
                time: eventTime,
                duration: dur * trackQuant * entry.track.lengthFactor / 100.0,
                velocity: vel,
              });
            }
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
    stopTrackLoops() {
      for (const loop of Object.values(this.trackLoops)) {
        loop.stop();
        loop.dispose();
      }
      this.trackLoops = {};
    },
    scheduleTrackLoopRebuild() {
      if (!this.isRunning) {
        return;
      }

      if (this.rebuildTrackLoopsTimer !== null) {
        window.clearTimeout(this.rebuildTrackLoopsTimer);
      }

      this.rebuildTrackLoopsTimer = window.setTimeout(() => {
        this.rebuildTrackLoopsTimer = null;
        this.rebuildTrackLoops();
      }, 90);
    },
    rebuildTrackLoops() {
      if (!this.isRunning) {
        return;
      }

      if (this.rebuildTrackLoopsTimer !== null) {
        window.clearTimeout(this.rebuildTrackLoopsTimer);
        this.rebuildTrackLoopsTimer = null;
      }

      this.stopTrackLoops();

      const totalLoopDuration = this.getLoopDurationSecondsFromTrackLengths();

      for (const entry of this.allTrackActualNotes) {
        if (entry.notes.length === 0 || !this.isTrackAudible(entry.track.id)) {
          continue;
        }

        const trackQuant = this.getTrackQuant(entry.track);
        const trackPeriod = entry.notes.length * trackQuant;
        if (trackPeriod <= 0) {
          continue;
        }

        const delaySeconds = this.getTrackDelaySeconds(entry.track);
        const events: Array<{ time: number; step: number }> = [];
        for (let repeat = 0; repeat < entry.track.repeats; repeat += 1) {
          const repeatStart = delaySeconds + repeat * trackPeriod;
          for (let i = 0; i < entry.notes.length; i += 1) {
            events.push({ time: repeatStart + (i * trackQuant), step: i });
          }
        }

        const part = markRaw(new Tone.Part<{ time: number; step: number }>((when, event) => {
          const liveTrack = this.tracks.find((track) => track.id === entry.track.id) ?? entry.track;
          this.playTrackStep(liveTrack, entry.notes, event.step, when);
        }, events));
        part.loop = true;
        part.loopStart = 0;
        part.loopEnd = totalLoopDuration;
        part.start(0);
        this.trackLoops[entry.track.id] = part;
      }
    },
    showPlaybackErrorMessage(message: string) {
      this.playbackErrorMessage = message;
      this.showPlaybackError = true;
    },
    setupAudioContextResumeOnInteraction() {
      const handler = () => {
        if (Tone.getContext().state !== 'running') {
          Tone.start().catch((error) => {
            console.warn('Failed to resume audio context on interaction:', error);
          });
        }
      };
      this.audioContextResumeHandler = handler;
      document.addEventListener('click', handler, { once: true });
      document.addEventListener('touchstart', handler, { once: true });
      document.addEventListener('keydown', handler, { once: true });
    },
    async startSequencer() {
      if (this.isRunning || this.isStarting) {
        return;
      }

      this.isStarting = true;
      try {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            await Tone.start();
            if (Tone.getContext().state === 'running') {
              break;
            }
            await new Promise((resolve) => window.setTimeout(resolve, 50));
          } catch (error) {
            lastError = error;
            await new Promise((resolve) => window.setTimeout(resolve, 100));
          }
        }

        if (Tone.getContext().state !== 'running') {
          throw lastError instanceof Error ? lastError : new Error('Audio context did not resume.');
        }

        this.applyRealtimeSettings();
        this.isRunning = true;
        this.rebuildTrackLoops();
        Tone.getTransport().seconds = 0;
        Tone.getTransport().start();
      } catch (error) {
        console.error('Unable to start audio playback:', error);
        this.isRunning = false;
        this.stopTrackLoops();
        Tone.getTransport().stop();
        const message = error instanceof Error ? error.message : String(error);
        this.showPlaybackErrorMessage(`Audio playback could not start: ${message}`);
      } finally {
        this.isStarting = false;
      }
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
      if (!this.isTrackAudible(track.id)) {
        return;
      }

      const arr = trackNotes[counter % trackNotes.length];
      this.activeNotes = Array.from(new Set([...this.activeNotes, ...arr])).sort((left, right) => left - right);

      if (arr.length === 0) {
        return;
      }

      const dur = this.getTrackStepDuration(trackNotes, counter);
      const vel = this.getTrackVelocity(arr, track.velocityMultiplier);
      const noteDuration = dur * this.getTrackQuant(track) * track.lengthFactor / 100.0;

      if (this.useMidiOutput) {
        for (const note of arr) {
          this.playNoteWithMidi(note, vel, noteDuration, when, track.midiChannel);
        }
      } else {
        const chain = this.getOrCreateTrackChain(track);
        this.scheduleFilterEnvelope(track, arr, when, noteDuration, chain.filter);
        chain.synth.triggerAttackRelease(
          this.getTrackPlaybackFrequencies(track, arr),
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
      if (this.isExporting) {
        return;
      }

      this.transportMenuOpen = false;
      this.startExport('midi', 'Preparing MIDI export...');
      try {
        this.exportProgress = 30;
        this.exportStatus = 'Building MIDI data...';
        const midi = await this.getMidi();
        this.exportProgress = 70;
        this.exportStatus = 'Encoding MIDI...';
        const data = midi.toArray();
        const blob = new Blob([Uint8Array.from(data)], { type: 'audio/midi' });
        this.exportProgress = 90;
        this.exportStatus = 'Downloading MIDI...';
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `GateRunner-${this.currentPresetFilenamePart()}-${this.formattedDate().toString()}-${this.forte}-${this.bpm}bpm.mid`;
        a.click();

        URL.revokeObjectURL(url);
        this.exportProgress = 100;
        this.exportStatus = 'MIDI export complete.';
      } catch (error) {
        console.error('Failed to export MIDI:', error);
        this.showNotice('MIDI export failed. Please try again.', 'error');
      } finally {
        this.finishExport();
      }
    },
    async downloadWAV() {
      if (this.isExporting) {
        return;
      }

      this.transportMenuOpen = false;
      this.startExport('wav', 'Preparing WAV export...');

      try {
        const data = await this.renderMixWav();
        this.setWavExportProgress(98, 'Finalizing download...');
        const wavBuffer = new ArrayBuffer(data.byteLength);
        new Uint8Array(wavBuffer).set(data);
        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `GateRunner-${this.currentPresetFilenamePart()}-${this.formattedDate().toString()}-${this.forte}-${this.bpm}bpm-mix.wav`;
        a.click();

        URL.revokeObjectURL(url);
        this.setWavExportProgress(100, 'WAV export complete.');
      } catch (error) {
        console.error('Failed to export WAV:', error);
        this.showNotice('WAV export failed. Please try again.', 'error');
      } finally {
        this.finishExport();
      }
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
    window.removeEventListener('resize', this.updateControlDeckHeight);
    this.controlDeckResizeObserver?.disconnect();
    if (this.audioContextResumeHandler) {
      document.removeEventListener('click', this.audioContextResumeHandler);
      document.removeEventListener('touchstart', this.audioContextResumeHandler);
      document.removeEventListener('keydown', this.audioContextResumeHandler);
    }
    if (this.rebuildTrackLoopsTimer !== null) {
      window.clearTimeout(this.rebuildTrackLoopsTimer);
      this.rebuildTrackLoopsTimer = null;
    }
    this.stopSequencer();
    for (const chain of Object.values(this.trackSynths)) {
      this.disposeTrackChain(chain);
    }
    this.trackSynths = {};
    if (this.reverbChain) {
      disposeReverbAudioChain(this.reverbChain as ReverbAudioChain);
      this.reverbChain = null;
    }
  },
  async mounted() {
    this.applyRealtimeSettings();
    if (this.useMidiOutput) {
      await this.initializeMidi();
    }

    this.$nextTick(() => {
      this.updateControlDeckHeight();
      const deck = this.$refs.controlDeck as HTMLElement | undefined;
      if (deck) {
        this.controlDeckResizeObserver = new ResizeObserver(this.updateControlDeckHeight);
        this.controlDeckResizeObserver.observe(deck);
      }
    });
    window.addEventListener('resize', this.updateControlDeckHeight);
    this.setupAudioContextResumeOnInteraction();
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
  display: none;
  pointer-events: none;
}

:deep(.v-application) {
  background: #000000 !important;
}

:deep(.v-main) {
  background: #000000 !important;
}

.app-shell {
  color: #e8f5ff;
  background: #000000;
}

.workspace-main {
  position: relative;
  z-index: 1;
  padding: 0 12px 16px;
  background: #000000;
}

.donation-footer {
  min-height: 28px;
  padding: 4px 12px;
  justify-content: center;
  background: #000000;
}

.donation-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: rgba(176, 226, 237, 0.58);
  text-decoration: none;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
}

.donation-link:hover,
.donation-link:focus-visible {
  color: #80dfff;
}

.control-deck {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  width: min(1120px, calc(100vw - 20px));
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 0;
  border: 1px solid rgba(0, 255, 209, 0.34);
  background: #000000;
  box-shadow: 0 0 22px rgba(0, 255, 209, 0.14), 0 14px 30px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(12px);
}

.control-deck-toggle {
  border: 1px solid rgba(111, 214, 231, 0.32);
  background: rgba(15, 45, 59, 0.52);
}

.toolbar-panel {
  padding: 8px 10px;
  border-radius: 0;
  border: 1px solid rgba(111, 214, 231, 0.26);
  background: #000000;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
}

.brand-group {
  flex: 1 1 auto;
  justify-content: center;
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.app-title {
  margin: 0;
  color: #f4fbff;
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  letter-spacing: 0;
  line-height: 1;
  background: linear-gradient(90deg, #f8fdff, #00ffd1 38%, #ff4fa3 72%, #f4d84c);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 18px rgba(0, 255, 209, 0.7), 0 0 28px rgba(255, 79, 163, 0.34);
}

.version-pill {
  font-size: 0.76rem;
  letter-spacing: 0.05em;
  color: rgba(208, 243, 255, 0.88);
  padding: 2px 8px;
  border-radius: 0;
  border: 1px solid rgba(138, 215, 235, 0.4);
  background: rgba(15, 45, 59, 0.52);
}

.toolbar-icon-btn {
  color: #d5f5ff;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
}

.header-icon-btn {
  width: 34px;
  height: 34px;
  border: 1px solid rgba(159, 244, 255, 0.22);
  box-shadow: 0 0 14px rgba(0, 255, 209, 0.14);
}

.play-toggle-btn {
  box-shadow: 0 0 16px rgba(111, 255, 124, 0.18);
}

.transport-actions {
  margin-top: 8px;
  display: grid;
  grid-template-columns: auto auto;
  justify-content: start;
  gap: 8px;
}

.transport-play-btn {
  min-width: 120px;
  font-weight: 700;
}

.transport-actions-menu-btn {
  min-width: 132px;
}

.transport-action-menu {
  min-width: 220px;
  border: 1px solid rgba(139, 213, 231, 0.3);
  background: rgba(4, 12, 17, 0.96);
}

.midi-menu-item {
  align-items: flex-start;
}

.midi-menu-switch {
  margin-top: 0;
}

.midi-menu-device-select {
  min-width: 220px;
}

.forte-control-top {
  min-width: 0;
}

.dependent-settings-row {
  margin-top: 8px;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.25fr);
  gap: 10px;
  align-items: center;
}

.tempo-control {
  min-width: 0;
}

.control-deck-spacer {
  width: 100%;
  pointer-events: none;
}

:deep(.v-btn),
:deep(.v-field),
:deep(.v-card),
:deep(.v-list),
:deep(.v-menu > .v-overlay__content),
:deep(.v-overlay__content),
:deep(.v-progress-linear),
:deep(.v-snackbar__wrapper) {
  border-radius: 0 !important;
}

:deep(.v-label),
:deep(.v-field__input),
:deep(.v-select__selection-text),
:deep(.v-autocomplete__selection-text),
:deep(.v-list-item-title),
:deep(.v-switch__label) {
  color: #ecf8ff !important;
}

:deep(.v-field) {
  border-radius: 0;
  background: #000000;
}

:deep(.v-field--variant-outlined .v-field__outline) {
  color: rgba(124, 208, 228, 0.58) !important;
}

:deep(.v-btn__content) {
  text-transform: none;
  letter-spacing: 0.015em;
}

.rename-dialog-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background: #000000;
}

@media (max-width: 960px) {
  .control-deck {
    width: calc(100vw - 16px);
    top: 8px;
  }

  .dependent-settings-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

}

@media (max-width: 680px) {
  .workspace-main {
    padding: 0 6px 10px;
  }

  .control-deck {
    width: calc(100vw - 10px);
    top: 6px;
    gap: 6px;
  }

  .toolbar-panel {
    padding: 8px 9px;
    border-radius: 0;
  }

  .brand-group {
    gap: 8px;
  }

  .version-pill {
    font-size: 0.7rem;
  }

  .dependent-settings-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

}
</style>