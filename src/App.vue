<template>
  <v-app class="app-shell">
    <AdjacencyMatrix class="shader-bg" :notes="activeNotes" :size="128" :flowWeight="2.0" :harmonyWeight="1.0" :decay="0.95" :minNote="noteRange.min" :maxNote="noteRange.max" />
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
            <v-icon>{{ controlDeckCollapsed ? 'mdi-chevron-right' : 'mdi-chevron-left' }}</v-icon>
          </v-btn>

          <div class="brand-group">
            <h1 class="app-title">GateRunner</h1>
            <span class="version-pill">v{{ appVersion }}</span>
          </div>

          <v-btn
            icon
            variant="text"
            size="small"
            class="toolbar-icon-btn"
            @click="showHelp = true"
          >
            <v-icon>mdi-help-circle</v-icon>
          </v-btn>
        </div>

        <div v-show="!controlDeckCollapsed" class="toolbar-panel transport-panel">
          <div class="transport-actions">
            <v-btn
              class="transport-play-btn"
              color="success"
              :prepend-icon="isRunning ? 'mdi-stop-circle-outline' : 'mdi-play-circle-outline'"
              :disabled="isStarting"
              @click="toggleSequencer"
            >
              {{ isRunning ? 'Stop' : 'Play' }}
            </v-btn>
            <v-menu v-model="transportMenuOpen" location="bottom end" :close-on-content-click="false">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  class="transport-actions-menu-btn"
                  variant="tonal"
                  color="primary"
                  prepend-icon="mdi-tune-variant"
                  append-icon="mdi-chevron-down"
                >
                  Actions
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
          </div>
        </div>

        <div v-show="!controlDeckCollapsed" class="toolbar-panel preset-panel">
          <div class="preset-inline-row">
            <v-select
              v-model="selectedPresetId"
              label="Preset"
              :item-title="'title'"
              :item-value="'value'"
              :items="presetOptions"
              hide-details
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-bookmark-multiple-outline"
              class="preset-select"
              @update:modelValue="handlePresetSelection"
            />
            <div class="preset-state-pill" :class="{ dirty: isDirty }">
              <v-icon size="16">{{ isDirty ? 'mdi-circle-edit-outline' : 'mdi-check-circle-outline' }}</v-icon>
              <span>{{ isDirty ? 'Unsaved changes' : 'Saved' }}</span>
            </div>
            <v-btn
              class="preset-rename-btn"
              color="info"
              variant="outlined"
              prepend-icon="mdi-form-textbox"
              @click="openRenamePresetDialog"
              :disabled="!currentPreset"
            >
              Rename
            </v-btn>
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn v-bind="props" class="preset-menu-btn" color="secondary" variant="tonal" append-icon="mdi-chevron-down">
                  Preset Actions
                </v-btn>
              </template>
              <v-list density="compact" class="preset-action-menu">
                <v-list-item
                  title="Save"
                  prepend-icon="mdi-content-save-outline"
                  :disabled="!currentPreset || !isDirty"
                  @click="saveCurrentPreset"
                />
                <v-list-item title="Save As" prepend-icon="mdi-content-save-edit-outline" @click="saveAsPreset" />
                <v-list-item title="New" prepend-icon="mdi-plus-box-outline" @click="createNewPreset" />
                <v-list-item title="Delete" prepend-icon="mdi-delete-outline" @click="deleteCurrentPreset" />
                <v-divider class="my-1" />
                <v-list-item title="Export Preset" prepend-icon="mdi-export-variant" @click="exportCurrentPreset" />
                <v-list-item title="Export Library" prepend-icon="mdi-database-export-outline" @click="exportPresetLibrary" />
                <v-list-item title="Import JSON" prepend-icon="mdi-file-import-outline" @click="triggerPresetImport" />
              </v-list>
            </v-menu>
          </div>
        </div>

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
          <div class="track-strip">
            <v-select
              v-model="selectedTrackId"
              :items="trackOptions"
              :item-title="'title'"
              :item-value="'value'"
              label="Track"
              hide-details
              density="compact"
              variant="outlined"
              prepend-inner-icon="mdi-playlist-music"
              class="track-select"
              @update:modelValue="handleTrackSelection"
            />
            <v-menu location="bottom end">
              <template #activator="{ props }">
                <v-btn
                  v-bind="props"
                  class="track-actions-menu-btn"
                  color="secondary"
                  variant="tonal"
                  prepend-icon="mdi-tune-variant"
                  append-icon="mdi-chevron-down"
                >
                  Track Actions
                </v-btn>
              </template>
              <v-list density="compact" class="track-action-menu">
                <v-list-item title="Add Track" prepend-icon="mdi-plus" @click="addTrack" />
                <v-list-item title="Rename Track" prepend-icon="mdi-form-textbox" :disabled="!currentTrack" @click="renameCurrentTrack" />
                <v-list-item title="Remove Track" prepend-icon="mdi-delete-outline" :disabled="tracks.length <= 1" @click="removeCurrentTrack" />
              </v-list>
            </v-menu>
          </div>
        </div>
      </div>

      <input
        ref="presetFileInput"
        type="file"
        accept=".json,application/json"
        class="preset-file-input"
        @change="handlePresetFileImport"
      />

      <div class="control-deck-spacer" :style="{ height: `${controlDeckHeight + 12}px` }"></div>

      <v-responsive class="editor-surface align-center mx-auto pa-4 pb-8" max-width="980">
        <v-expansion-panels v-model="expandedPanels" multiple class="control-sections">
          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Sequence</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="trackWaveform"
              label="Waveform"
              :items="['sine', 'square', 'triangle', 'sawtooth']"
              hide-details="auto"
              density="comfortable"
              variant="outlined"
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
              hide-details="auto"
              density="comfortable"
              variant="outlined"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Playback</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Numerator (' + trackNumerator + ')'"
              :min="1"
              :step="1"
              :max="16"
              v-model="trackNumerator"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Denominator (' + trackDenominator + ')'"
              :min="1"
              :step="1"
              :max="16"
              v-model="trackDenominator"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Octave shift (' + trackOctave + ')'"
              :min="0"
              :step="1"
              :max="10"
              v-model="trackOctave"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Note Length (' + trackLengthFactor + '%)'"
              :min="1"
              :max="400"
              :step="1"
              v-model="trackLengthFactor"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Gain (' + Number(trackGain).toFixed(1) + ' dB)'"
              :min="-96"
              :max="24"
              :step="0.1"
              v-model="trackGain"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Velocity Multiplier (' + Number(trackVelocityMultiplier).toFixed(2) + 'x)'"
              :min="0"
              :max="4"
              :step="0.01"
              v-model="trackVelocityMultiplier"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track MIDI Channel (' + trackMidiChannel + ')'"
              :min="1"
              :max="16"
              :step="1"
              v-model="trackMidiChannel"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Delay (' + trackDelay + ' bars)'"
              :min="0"
              :max="64"
              :step="1"
              v-model="trackDelay"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>

        <v-row class="compact-row">
          <v-col cols="12">
            <EditableSlider
              :label="'Track Repeats (' + trackRepeats + ')'"
              :min="1"
              :max="64"
              :step="1"
              v-model="trackRepeats"
              @update:modelValue="handleTrackDraftChange"
            />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Instrument</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Attack (' + Number(trackAttack).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="trackAttack" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <EditableSlider :label="'Release (' + Number(trackRelease).toFixed(2) + 's)'" :min="0" :max="20" :step="0.01" v-model="trackRelease" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Unison voices (' + trackUnisonVoices + ')'" :min="1" :max="8" :step="1" v-model="trackUnisonVoices" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <EditableSlider :label="'Unison detune (' + Number(trackUnisonDetune).toFixed(1) + ' cents)'" :min="0" :max="100" :step="0.5" v-model="trackUnisonDetune" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Modulation</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-switch v-model="trackTremoloEnabled" label="Tremolo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch v-model="trackVibratoEnabled" label="Vibrato" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <EditableSlider :label="'Tremolo Rate (' + Number(trackTremoloFrequency).toFixed(2) + ' Hz)'" :min="0.01" :max="40" :step="0.01" v-model="trackTremoloFrequency" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Tremolo Depth (' + Number(trackTremoloDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="trackTremoloDepth" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Tremolo Spread (' + Number(trackTremoloSpread).toFixed(0) + '°)'" :min="0" :max="360" :step="1" v-model="trackTremoloSpread" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Vibrato Rate (' + Number(trackVibratoFrequency).toFixed(2) + ' Hz)'" :min="0.01" :max="40" :step="0.01" v-model="trackVibratoFrequency" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <EditableSlider :label="'Vibrato Depth (' + Number(trackVibratoDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="trackVibratoDepth" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Filter</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-switch v-model="trackFilterEnabled" label="Enable Filter" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="trackFilterType" label="Filter Mode" :items="['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking']" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <EditableSlider :label="'Cutoff/Base (' + Number(trackFilterFrequency).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="trackFilterFrequency" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Q (' + Number(trackFilterQ).toFixed(2) + ')'" :min="0.01" :max="30" :step="0.01" v-model="trackFilterQ" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Key Follow (' + Number(trackFilterKeyFollow).toFixed(0) + '%)'" :min="-200" :max="200" :step="1" v-model="trackFilterKeyFollow" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Filter Gain (' + Number(trackFilterGain).toFixed(1) + ' dB)'" :min="-48" :max="48" :step="0.1" v-model="trackFilterGain" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-select v-model="trackFilterRolloff" label="Rolloff" :items="[-12, -24, -48, -96]" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Soft Limiter</v-expansion-panel-title>
            <v-expansion-panel-text>
              <EditableSlider :label="'Limiter Gain (' + Number(trackLimiterGain).toFixed(1) + ' dB)'" :min="-48" :max="48" :step="0.1" v-model="trackLimiterGain" @update:modelValue="handleTrackDraftChange" />
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Effects</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-switch v-model="trackEchoEnabled" label="Feedback Stereo Echo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch v-model="trackEchoPingPong" label="Ping-pong echo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <v-select v-model="trackEchoDelay" label="Echo Delay" :items="echoDelayOptions" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Echo Feedback (' + Number(trackEchoFeedback).toFixed(2) + ')'" :min="0" :max="0.95" :step="0.01" v-model="trackEchoFeedback" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Echo Wet (' + Number(trackEchoWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="trackEchoWet" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Track Reverb Send (' + Number(trackReverbWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="trackReverbWet" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>

          <v-expansion-panel class="control-section">
            <v-expansion-panel-title>Global Reverb</v-expansion-panel-title>
            <v-expansion-panel-text>
        <v-row>
          <v-col cols="12">
            <v-switch v-model="reverbEnabled" label="Enable High Quality Global Reverb" hide-details density="compact" @update:modelValue="handleDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <EditableSlider :label="'Reverb Decay (' + Number(reverbDecay).toFixed(2) + 's)'" :min="0.1" :max="30" :step="0.1" v-model="reverbDecay" @update:modelValue="handleDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Pre-delay (' + Number(reverbPreDelay).toFixed(2) + 's)'" :min="0" :max="1" :step="0.01" v-model="reverbPreDelay" @update:modelValue="handleDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Global Reverb Wet (' + Number(reverbWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="reverbWet" @update:modelValue="handleDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Reverb Low Cut (' + Number(reverbLowCut).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="reverbLowCut" @update:modelValue="handleDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <EditableSlider :label="'Reverb High Cut (' + Number(reverbHighCut).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="reverbHighCut" @update:modelValue="handleDraftChange" />
          </v-col>
        </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>

      </v-responsive>

      <v-dialog v-model="isExporting" persistent max-width="420">
        <v-card class="export-dialog-card">
          <v-card-text class="text-center py-6 px-4">
            <v-icon size="48" color="primary" class="mb-4">mdi-{{ exportFormat === 'wav' ? 'waveform' : 'music-note' }}</v-icon>
            <div class="text-h6 mb-2">Exporting {{ exportFormatLabel }}</div>
            <div class="text-body-2 text-medium-emphasis mb-5">{{ exportStatus }}</div>
            <v-progress-linear
              v-if="exportProgress >= 0"
              :model-value="exportProgress"
              color="primary"
              height="12"
              rounded
              striped
            />
            <v-progress-linear
              v-else
              indeterminate
              color="primary"
              height="12"
              rounded
            />
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showRenamePresetDialog" max-width="460px">
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">Rename Preset</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="renamePresetInput"
              label="Preset name"
              density="comfortable"
              variant="outlined"
              autofocus
              @keydown.enter.prevent="confirmPresetRename"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="cancelPresetRename">Cancel</v-btn>
            <v-btn color="primary" @click="confirmPresetRename" :disabled="!canSubmitPresetRename">Rename</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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
              <li><strong>Tracks</strong>: Each preset can contain multiple tracks with their own MIDI channel, waveform, gain, sequence, octave shift, note length, envelope, unison, modulation, filter, echo, and reverb send.</li>
              <li><strong>Waveform</strong>: Select from sine, square, triangle, or sawtooth waveforms per track.</li>
              <li><strong>Sequence</strong>: Input a sequence of numbers per track to generate notes based on their binary
                representation.</li>
              <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played for the selected track.</li>
              <li><strong>Track Gain</strong>: Sets each track's audio level in dB. Use the velocity multiplier to control MIDI note velocity independently.</li>
              <li><strong>Note length</strong>: Multiplies the durations of the selected track's notes.</li>
              <li><strong>Track Delay</strong>: Number of bars to wait before the track starts playing.</li>
              <li><strong>Track Repeats</strong>: Number of times the track's pattern is repeated. After its repeats, the track stays silent until the longest track finishes, then everything loops.</li>
              <li><strong>Instrument/Modulation/Filter</strong>: Shape each track with attack/release, unison voices, tremolo, vibrato, and a key-following multimode filter.</li>
              <li><strong>Effects</strong>: Add optional per-track feedback echo and send each track into the global high-quality reverb.</li>
              <li><strong>Import/Export</strong>: Export one preset or the full library as JSON for backup and sharing, then import those files later without overwriting your existing presets.</li>
              <li><strong>WAV Export</strong>: Render and download an offline WAV mix of all tracks in the current draft, including an automatic rest trail for releases and effects.</li>
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
  </v-app>
</template>

<script lang="ts">
import pkg from '../package.json';
const appVersion = pkg.version;
import { defineComponent, markRaw } from 'vue';
import AdjacencyMatrix from './components/AdjacencyMatrix.vue';
import EditableSlider from './components/EditableSlider.vue';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from 'ultra-mega-enumerator';
import {
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  ECHO_DELAY_OPTIONS,
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
  type EchoDelayValue,
  type PresetData,
  type PresetLibrary,
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
}

interface ReverbAudioChain {
  lowCut: Tone.Filter;
  highCut: Tone.Filter;
  reverb: Tone.Reverb;
}

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
    AdjacencyMatrix,
    EditableSlider,
  },
  data() {
    const firstTrack = initialState.draft.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;
    return {
      bpm: initialState.draft.bpm,
      forte: initialState.draft.forte,
      tracks: initialState.draft.tracks.map((track) => clonePresetTrackData(track)) as PresetTrackData[],
      selectedTrackId: initialState.selectedTrackId as string | null,
      trackNumerator: firstTrack.numerator,
      trackDenominator: firstTrack.denominator,
      trackWaveform: firstTrack.waveform,
      trackSequenceInput: firstTrack.sequenceInput,
      trackOctave: firstTrack.octave,
      trackLengthFactor: firstTrack.lengthFactor,
      trackMidiChannel: firstTrack.midiChannel,
      trackGain: firstTrack.gain,
      trackVelocityMultiplier: firstTrack.velocityMultiplier,
      trackDelay: firstTrack.delay,
      trackRepeats: firstTrack.repeats,
      trackAttack: firstTrack.attack,
      trackRelease: firstTrack.release,
      trackUnisonVoices: firstTrack.unisonVoices,
      trackUnisonDetune: firstTrack.unisonDetune,
      trackTremoloEnabled: firstTrack.tremoloEnabled,
      trackTremoloFrequency: firstTrack.tremoloFrequency,
      trackTremoloDepth: firstTrack.tremoloDepth,
      trackTremoloSpread: firstTrack.tremoloSpread,
      trackVibratoEnabled: firstTrack.vibratoEnabled,
      trackVibratoFrequency: firstTrack.vibratoFrequency,
      trackVibratoDepth: firstTrack.vibratoDepth,
      trackFilterEnabled: firstTrack.filterEnabled,
      trackFilterType: firstTrack.filterType,
      trackFilterFrequency: firstTrack.filterFrequency,
      trackFilterRolloff: firstTrack.filterRolloff,
      trackFilterQ: firstTrack.filterQ,
      trackFilterGain: firstTrack.filterGain,
      trackFilterKeyFollow: firstTrack.filterKeyFollow,
      trackLimiterGain: firstTrack.limiterGain,
      trackEchoEnabled: firstTrack.echoEnabled,
      trackEchoDelay: firstTrack.echoDelay,
      echoDelayOptions: ECHO_DELAY_OPTIONS,
      trackEchoFeedback: firstTrack.echoFeedback,
      trackEchoWet: firstTrack.echoWet,
      trackEchoPingPong: firstTrack.echoPingPong,
      trackReverbWet: firstTrack.reverbWet,
      reverbEnabled: initialState.draft.reverb.enabled,
      reverbDecay: initialState.draft.reverb.decay,
      reverbPreDelay: initialState.draft.reverb.preDelay,
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
      presetLibrary: initialState.presetLibrary as PresetLibrary,
      selectedPresetId: initialState.selectedPresetId as string | null,
      isDirty: initialState.isDirty,
      showRenamePresetDialog: false,
      renamePresetInput: '',
      isExporting: false,
      exportFormat: null as 'midi' | 'wav' | null,
      exportProgress: 0,
      exportStatus: '',
      transportMenuOpen: false,
      controlDeckHeight: 0,
      controlDeckCollapsed: false,
      controlDeckResizeObserver: null as ResizeObserver | null,
      expandedPanels: [0, 1, 2, 3, 4, 5] as number[],
    };
  },
  computed: {
    currentPreset(): NamedPreset | null {
      return this.presetLibrary.presets.find((preset) => preset.id === this.presetLibrary.selectedPresetId) ?? this.presetLibrary.presets[0] ?? null;
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
    canSubmitPresetRename(): boolean {
      if (!this.currentPreset) {
        return false;
      }

      const nextName = sanitizePresetName(this.renamePresetInput);
      return nextName !== this.currentPreset.name;
    },
    exportFormatLabel(): string {
      return this.exportFormat === 'wav' ? 'WAV mix' : this.exportFormat === 'midi' ? 'MIDI file' : '';
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
    getTrackBarSeconds(track: PresetTrackData): number {
      return track.numerator * (60.0 / this.bpm);
    },
    getTrackDelaySeconds(track: PresetTrackData): number {
      return track.delay * this.getTrackBarSeconds(track);
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
    syncTrackEditorFromCurrent() {
      const track = this.currentTrack;
      if (!track) {
        return;
      }

      this.trackNumerator = track.numerator;
      this.trackDenominator = track.denominator;
      this.trackWaveform = track.waveform;
      this.trackSequenceInput = track.sequenceInput;
      this.trackOctave = track.octave;
      this.trackLengthFactor = track.lengthFactor;
      this.trackMidiChannel = track.midiChannel;
      this.trackGain = track.gain;
      this.trackVelocityMultiplier = track.velocityMultiplier;
      this.trackDelay = track.delay;
      this.trackRepeats = track.repeats;
      this.trackAttack = track.attack;
      this.trackRelease = track.release;
      this.trackUnisonVoices = track.unisonVoices;
      this.trackUnisonDetune = track.unisonDetune;
      this.trackTremoloEnabled = track.tremoloEnabled;
      this.trackTremoloFrequency = track.tremoloFrequency;
      this.trackTremoloDepth = track.tremoloDepth;
      this.trackTremoloSpread = track.tremoloSpread;
      this.trackVibratoEnabled = track.vibratoEnabled;
      this.trackVibratoFrequency = track.vibratoFrequency;
      this.trackVibratoDepth = track.vibratoDepth;
      this.trackFilterEnabled = track.filterEnabled;
      this.trackFilterType = track.filterType;
      this.trackFilterFrequency = track.filterFrequency;
      this.trackFilterRolloff = track.filterRolloff;
      this.trackFilterQ = track.filterQ;
      this.trackFilterGain = track.filterGain;
      this.trackFilterKeyFollow = track.filterKeyFollow;
      this.trackLimiterGain = track.limiterGain;
      this.trackEchoEnabled = track.echoEnabled;
      this.trackEchoDelay = track.echoDelay;
      this.trackEchoFeedback = track.echoFeedback;
      this.trackEchoWet = track.echoWet;
      this.trackEchoPingPong = track.echoPingPong;
      this.trackReverbWet = track.reverbWet;
    },
    applyTrackEditorToCurrent() {
      const currentTrack = this.currentTrack;
      if (!currentTrack) {
        return;
      }

      const normalizedTrack = normalizePresetTrackData({
        id: currentTrack.id,
        name: currentTrack.name,
        numerator: this.trackNumerator,
        denominator: this.trackDenominator,
        waveform: this.trackWaveform,
        sequenceInput: this.trackSequenceInput,
        octave: this.trackOctave,
        lengthFactor: this.trackLengthFactor,
        midiChannel: this.trackMidiChannel,
        gain: this.trackGain,
        velocityMultiplier: this.trackVelocityMultiplier,
        delay: this.trackDelay,
        repeats: this.trackRepeats,
        attack: this.trackAttack,
        release: this.trackRelease,
        unisonVoices: this.trackUnisonVoices,
        unisonDetune: this.trackUnisonDetune,
        tremoloEnabled: this.trackTremoloEnabled,
        tremoloFrequency: this.trackTremoloFrequency,
        tremoloDepth: this.trackTremoloDepth,
        tremoloSpread: this.trackTremoloSpread,
        vibratoEnabled: this.trackVibratoEnabled,
        vibratoFrequency: this.trackVibratoFrequency,
        vibratoDepth: this.trackVibratoDepth,
        filterEnabled: this.trackFilterEnabled,
        filterType: this.trackFilterType,
        filterFrequency: this.trackFilterFrequency,
        filterRolloff: this.trackFilterRolloff,
        filterQ: this.trackFilterQ,
        filterGain: this.trackFilterGain,
        filterKeyFollow: this.trackFilterKeyFollow,
        limiterGain: this.trackLimiterGain,
        echoEnabled: this.trackEchoEnabled,
        echoDelay: this.trackEchoDelay,
        echoFeedback: this.trackEchoFeedback,
        echoWet: this.trackEchoWet,
        echoPingPong: this.trackEchoPingPong,
        reverbWet: this.trackReverbWet,
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
        velocityMultiplier: this.currentTrack?.velocityMultiplier ?? DEFAULT_PRESET_TRACK_DATA.velocityMultiplier,
        delay: this.currentTrack?.delay ?? DEFAULT_PRESET_TRACK_DATA.delay,
        repeats: this.currentTrack?.repeats ?? DEFAULT_PRESET_TRACK_DATA.repeats,
        attack: this.currentTrack?.attack ?? DEFAULT_PRESET_TRACK_DATA.attack,
        release: this.currentTrack?.release ?? DEFAULT_PRESET_TRACK_DATA.release,
        unisonVoices: this.currentTrack?.unisonVoices ?? DEFAULT_PRESET_TRACK_DATA.unisonVoices,
        unisonDetune: this.currentTrack?.unisonDetune ?? DEFAULT_PRESET_TRACK_DATA.unisonDetune,
        tremoloEnabled: this.currentTrack?.tremoloEnabled ?? DEFAULT_PRESET_TRACK_DATA.tremoloEnabled,
        tremoloFrequency: this.currentTrack?.tremoloFrequency ?? DEFAULT_PRESET_TRACK_DATA.tremoloFrequency,
        tremoloDepth: this.currentTrack?.tremoloDepth ?? DEFAULT_PRESET_TRACK_DATA.tremoloDepth,
        tremoloSpread: this.currentTrack?.tremoloSpread ?? DEFAULT_PRESET_TRACK_DATA.tremoloSpread,
        vibratoEnabled: this.currentTrack?.vibratoEnabled ?? DEFAULT_PRESET_TRACK_DATA.vibratoEnabled,
        vibratoFrequency: this.currentTrack?.vibratoFrequency ?? DEFAULT_PRESET_TRACK_DATA.vibratoFrequency,
        vibratoDepth: this.currentTrack?.vibratoDepth ?? DEFAULT_PRESET_TRACK_DATA.vibratoDepth,
        filterEnabled: this.currentTrack?.filterEnabled ?? DEFAULT_PRESET_TRACK_DATA.filterEnabled,
        filterType: this.currentTrack?.filterType ?? DEFAULT_PRESET_TRACK_DATA.filterType,
        filterFrequency: this.currentTrack?.filterFrequency ?? DEFAULT_PRESET_TRACK_DATA.filterFrequency,
        filterRolloff: this.currentTrack?.filterRolloff ?? DEFAULT_PRESET_TRACK_DATA.filterRolloff,
        filterQ: this.currentTrack?.filterQ ?? DEFAULT_PRESET_TRACK_DATA.filterQ,
        filterGain: this.currentTrack?.filterGain ?? DEFAULT_PRESET_TRACK_DATA.filterGain,
        filterKeyFollow: this.currentTrack?.filterKeyFollow ?? DEFAULT_PRESET_TRACK_DATA.filterKeyFollow,
        echoEnabled: this.currentTrack?.echoEnabled ?? DEFAULT_PRESET_TRACK_DATA.echoEnabled,
        echoDelay: this.currentTrack?.echoDelay ?? DEFAULT_PRESET_TRACK_DATA.echoDelay,
        echoFeedback: this.currentTrack?.echoFeedback ?? DEFAULT_PRESET_TRACK_DATA.echoFeedback,
        echoWet: this.currentTrack?.echoWet ?? DEFAULT_PRESET_TRACK_DATA.echoWet,
        echoPingPong: this.currentTrack?.echoPingPong ?? DEFAULT_PRESET_TRACK_DATA.echoPingPong,
        reverbWet: this.currentTrack?.reverbWet ?? DEFAULT_PRESET_TRACK_DATA.reverbWet,
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
    renameCurrentTrack() {
      const currentTrack = this.currentTrack;
      if (!currentTrack) {
        return;
      }

      const suggestedName = this.buildUniqueTrackName(currentTrack.name, currentTrack.id);
      const requestedName = window.prompt(`Rename track "${currentTrack.name}"`, suggestedName);
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
        const offlineReverb = this.getOrCreateReverbChain();
        offlineReverb.lowCut.set({ frequency: this.midiToFrequency(this.reverbLowCut) });
        offlineReverb.highCut.set({ frequency: this.midiToFrequency(this.reverbHighCut) });
        offlineReverb.reverb.set({
          decay: this.reverbDecay,
          preDelay: this.reverbPreDelay,
          wet: this.reverbEnabled ? this.dbToWetMix(this.reverbWet) : 0,
        });

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
              chain.filter.frequency.setValueAtTime(this.getTrackFilterFrequency(entry.track, notes), eventTime);

              chain.synth.triggerAttackRelease(
                notes.map((note) => Tone.Frequency(note, 'midi').toFrequency()),
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

      return this.encodeWavFromChannels(channels, audioBuffer.sampleRate);
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
      this.reverbWet = normalized.reverb.wet;
      this.reverbLowCut = normalized.reverb.lowCut;
      this.reverbHighCut = normalized.reverb.highCut;

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
    openRenamePresetDialog() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      this.renamePresetInput = currentPreset.name;
      this.showRenamePresetDialog = true;
    },
    cancelPresetRename() {
      this.showRenamePresetDialog = false;
      this.renamePresetInput = '';
    },
    confirmPresetRename() {
      if (!this.currentPreset) {
        return;
      }

      if (!this.canSubmitPresetRename) {
        this.cancelPresetRename();
        return;
      }

      this.renameCurrentPreset(this.renamePresetInput);
      this.cancelPresetRename();
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
    renameCurrentPreset(baseName?: string) {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      const nextName = this.buildUniquePresetName(baseName ?? currentPreset.name, currentPreset.id);
      if (nextName === currentPreset.name) {
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
      this.refreshDirtyState();
      window.alert(`Saved preset "${updatedPreset.name}".`);
    },
    saveAsPreset() {
      const suggestedName = this.buildUniquePresetName(`${this.currentPreset?.name ?? 'Preset'} Copy`);
      const requestedName = window.prompt('Name for the new preset copy:', suggestedName);
      if (requestedName === null) {
        return;
      }

      const name = this.buildUniquePresetName(requestedName);
      const newPreset = createNamedPreset(name, this.getDraftData());
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, newPreset],
        selectedPresetId: newPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = newPreset.id;
      this.applyDraftData(newPreset.data);
      this.refreshDirtyState();
      window.alert(`Created preset "${newPreset.name}".`);
    },
    createNewPreset() {
      if (!this.confirmDiscardChanges('Create a new preset and discard them')) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      const suggestedName = this.buildUniquePresetName('New preset');
      const requestedName = window.prompt('Name for the new preset:', suggestedName);
      if (requestedName === null) {
        return;
      }

      const name = this.buildUniquePresetName(requestedName);
      const preset = createNamedPreset(name, DEFAULT_PRESET_DATA);
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, preset],
        selectedPresetId: preset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = preset.id;
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
      this.applyDraftData(fallbackPreset.data);
      this.refreshDirtyState();
    },
    sanitizeFilenamePart(value: string) {
      return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'preset';
    },
    currentPresetFilenamePart() {
      return this.sanitizeFilenamePart(this.currentPreset?.name ?? 'preset');
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

      const lowCut = markRaw(new Tone.Filter({ type: 'highpass', frequency: this.midiToFrequency(this.reverbLowCut), rolloff: -12 })) as Tone.Filter;
      const highCut = markRaw(new Tone.Filter({ type: 'lowpass', frequency: this.midiToFrequency(this.reverbHighCut), rolloff: -12 })) as Tone.Filter;
      const reverb = markRaw(new Tone.Reverb({
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        wet: this.reverbEnabled ? this.dbToWetMix(this.reverbWet) : 0,
      }).toDestination()) as Tone.Reverb;

      lowCut.chain(highCut, reverb);
      this.reverbChain = { lowCut, highCut, reverb };
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
      const dryGain = markRaw(new Tone.Gain(1).toDestination());
      const reverbSend = markRaw(new Tone.Gain(0));

      tremolo.start();
      synth.chain(filter, limiterGain, limiter, vibrato, tremolo, echo, outputGain);
      outputGain.connect(dryGain);
      reverbSend.connect(this.getOrCreateReverbChain().lowCut);
      outputGain.connect(reverbSend);

      return { synth, filter, limiterGain, limiter, tremolo, vibrato, echo, echoPingPong, maxDelay, dryGain, reverbSend, outputGain };
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
      return chain;
    },
    getWaveformType(waveform: string): 'sine' | 'square' | 'triangle' | 'sawtooth' {
      if (waveform === 'triangle') {
        return 'triangle';
      }
      if (waveform === 'sawtooth') {
        return 'sawtooth';
      }
      if (waveform === 'square') {
        return 'square';
      }
      return 'sine';
    },
    getOscillatorType(track: PresetTrackData): string {
      const waveform = this.getWaveformType(track.waveform);
      return track.unisonVoices > 1 ? `fat${waveform}` : waveform;
    },
    getTrackFilterFrequency(track: PresetTrackData, notes: number[] = []): number {
      if (!track.filterEnabled || notes.length === 0 || track.filterKeyFollow === 0) {
        return this.midiToFrequency(track.filterFrequency);
      }

      const averageMidi = notes.reduce((sum, note) => sum + note, 0) / notes.length;
      const followed = track.filterFrequency + (averageMidi - 69) * track.filterKeyFollow / 100;
      return this.midiToFrequency(Math.max(0, Math.min(127, followed)));
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
    },
    updateReverbChain() {
      const chain = this.getOrCreateReverbChain();
      chain.lowCut.set({ frequency: this.midiToFrequency(this.reverbLowCut) });
      chain.highCut.set({ frequency: this.midiToFrequency(this.reverbHighCut) });
      chain.reverb.set({
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        wet: this.reverbEnabled ? this.dbToWetMix(this.reverbWet) : 0,
      });
    },
    updateTrackChainSettings(track: PresetTrackData, chain: TrackAudioChain) {
      const oscillatorOptions = {
        type: this.getOscillatorType(track) as Tone.ToneOscillatorType,
        count: track.unisonVoices,
        spread: track.unisonDetune,
      } as unknown as Tone.PolySynthOptions<Tone.Synth<Tone.SynthOptions>>['options']['oscillator'];

      chain.synth.set({
        envelope: {
          attackCurve: 'exponential',
          attack: track.attack.toString() + 's',
          decay: 0,
          releaseCurve: 'exponential',
          release: track.release.toString() + 's',
          sustain: 1.0,
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
      chain.reverbSend.gain.value = this.reverbEnabled ? this.dbToGain(track.reverbWet) : 0;
      chain.synth.context.lookAhead = 0.05;
    },
    updateSynths() {
      const activeTrackIds = new Set(this.tracks.map((track) => track.id));
      for (const [trackId, chain] of Object.entries(this.trackSynths)) {
        if (!activeTrackIds.has(trackId)) {
          this.disposeTrackChain(chain);
          delete this.trackSynths[trackId];
        }
      }

      this.updateReverbChain();

      for (const track of this.tracks) {
        const chain = this.getOrCreateTrackChain(track);
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
    rebuildTrackLoops() {
      if (!this.isRunning) {
        return;
      }

      this.stopTrackLoops();

      const totalLoopDuration = this.getLoopDurationSecondsFromTrackLengths();

      for (const entry of this.allTrackActualNotes) {
        if (entry.notes.length === 0) {
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
          this.playTrackStep(entry.track, entry.notes, event.step, when);
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
        chain.filter.frequency.setValueAtTime(this.getTrackFilterFrequency(track, arr), when);
        chain.synth.triggerAttackRelease(
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
        window.alert('MIDI export failed. Please try again.');
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
        window.alert('WAV export failed. Please try again.');
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
      this.syncTrackEditorFromCurrent();
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
    this.stopSequencer();
    for (const chain of Object.values(this.trackSynths)) {
      this.disposeTrackChain(chain);
    }
    this.trackSynths = {};
    if (this.reverbChain) {
      this.reverbChain.lowCut.dispose();
      this.reverbChain.highCut.dispose();
      this.reverbChain.reverb.dispose();
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
  pointer-events: none;
}

:deep(.v-application) {
  background: transparent !important;
}

:deep(.v-main) {
  background: transparent !important;
}

.app-shell {
  color: #e8f5ff;
}

.workspace-main {
  position: relative;
  z-index: 1;
  padding: 0 12px 16px;
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
  gap: 8px;
}

.control-deck-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid rgba(111, 214, 231, 0.32);
  background:
    linear-gradient(135deg, rgba(7, 14, 20, 0.92), rgba(9, 25, 34, 0.9)),
    radial-gradient(circle at top right, rgba(225, 167, 73, 0.18), transparent 45%);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
  backdrop-filter: blur(12px);
}

.control-deck-toggle {
  border: 1px solid rgba(111, 214, 231, 0.32);
  background: rgba(15, 45, 59, 0.52);
}

.toolbar-panel {
  padding: 10px 12px;
  border-radius: 14px;
  border: 1px solid rgba(111, 214, 231, 0.32);
  background:
    linear-gradient(135deg, rgba(7, 14, 20, 0.92), rgba(9, 25, 34, 0.9)),
    radial-gradient(circle at top right, rgba(225, 167, 73, 0.18), transparent 45%);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.34);
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
  letter-spacing: 0.04em;
  line-height: 1;
}

.version-pill {
  font-size: 0.76rem;
  letter-spacing: 0.05em;
  color: rgba(208, 243, 255, 0.88);
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(138, 215, 235, 0.4);
  background: rgba(15, 45, 59, 0.52);
}

.toolbar-icon-btn {
  color: #d5f5ff;
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

.preset-panel {
  overflow-x: auto;
}

.preset-inline-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto auto;
  gap: 8px;
  align-items: center;
  min-width: 760px;
}

.preset-state-pill {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(135, 211, 230, 0.35);
  border-radius: 999px;
  background: rgba(8, 23, 32, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(220, 247, 255, 0.8);
  font-size: 0.82rem;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.preset-state-pill.dirty {
  color: #ffd39a;
  border-color: rgba(244, 176, 88, 0.48);
  background: rgba(47, 27, 8, 0.56);
}

.preset-rename-btn {
  min-width: 136px;
}

.preset-menu-btn {
  min-width: 164px;
}

.preset-action-menu {
  min-width: 240px;
  border: 1px solid rgba(139, 213, 231, 0.3);
  background: rgba(4, 12, 17, 0.96);
}

.track-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.track-actions-menu-btn {
  min-width: 168px;
}

.track-action-menu {
  min-width: 220px;
  border: 1px solid rgba(139, 213, 231, 0.3);
  background: rgba(4, 12, 17, 0.96);
}

.preset-file-input {
  display: none;
}

.control-deck-spacer {
  width: 100%;
  pointer-events: none;
}

.editor-surface {
  background:
    linear-gradient(145deg, rgba(9, 22, 30, 0.78), rgba(3, 10, 14, 0.88)),
    radial-gradient(circle at 80% 0%, rgba(228, 171, 77, 0.16), transparent 52%);
  border: 1px solid rgba(122, 206, 226, 0.3);
  border-radius: 20px;
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.32);
}

.control-sections {
  gap: 10px;
}

.control-section {
  margin-bottom: 10px;
  border: 1px solid rgba(127, 211, 231, 0.26);
  border-radius: 14px !important;
  overflow: hidden;
  background: rgba(4, 13, 19, 0.46);
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
  border-radius: 12px;
  background: rgba(3, 11, 16, 0.6);
}

:deep(.v-field--variant-outlined .v-field__outline) {
  color: rgba(124, 208, 228, 0.58) !important;
}

:deep(.v-btn__content) {
  text-transform: none;
  letter-spacing: 0.015em;
}

.export-dialog-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background:
    linear-gradient(145deg, rgba(11, 28, 38, 0.95), rgba(6, 18, 26, 0.97)),
    radial-gradient(circle at top right, rgba(226, 164, 77, 0.16), transparent 55%);
}

.rename-dialog-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background:
    linear-gradient(145deg, rgba(11, 28, 38, 0.95), rgba(6, 18, 26, 0.97)),
    radial-gradient(circle at top right, rgba(226, 164, 77, 0.16), transparent 55%);
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
}

.compact-row {
  margin-top: -4px;
}

@media (max-width: 960px) {
  .control-deck {
    width: calc(100vw - 16px);
    top: 8px;
  }

  .dependent-settings-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .preset-inline-row {
    min-width: 700px;
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
    border-radius: 12px;
  }

  .brand-group {
    gap: 8px;
  }

  .version-pill {
    font-size: 0.7rem;
  }

  .transport-actions {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 6px;
  }

  .dependent-settings-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .transport-actions-menu-btn,
  .track-actions-menu-btn {
    width: 100%;
    min-width: 0;
  }

  .preset-panel {
    overflow-x: visible;
  }

  .preset-inline-row {
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "selector state"
      "rename menu";
    column-gap: 6px;
    row-gap: 8px;
  }

  .preset-select {
    grid-area: selector;
  }

  .preset-state-pill {
    grid-area: state;
    font-size: 0.75rem;
    padding: 6px 10px;
  }

  .preset-rename-btn {
    grid-area: rename;
    width: 100%;
    min-width: 0;
  }

  .preset-menu-btn {
    grid-area: menu;
    width: 100%;
    min-width: 0;
  }

  .track-strip {
    grid-template-columns: 1fr;
  }

  .compact-row {
    margin-left: -12px;
    margin-right: -12px;
    padding-left: 12px;
    padding-right: 12px;
    touch-action: pan-y;
  }

  .compact-row :deep(.v-col) {
    padding-left: 0;
    padding-right: 0;
  }

  .compact-row :deep(.v-slider) {
    margin-left: 8px;
    margin-right: 8px;
  }

  .editor-surface {
    border-radius: 14px;
    padding: 12px !important;
  }
}
</style>