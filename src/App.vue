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

        <div v-show="!controlDeckCollapsed" class="toolbar-panel preset-panel">
          <div class="preset-inline-row">
            <v-btn
              class="preset-browser-launch"
              color="primary"
              variant="outlined"
              prepend-icon="mdi-folder-multiple-outline"
              @click="openPresetBrowser"
            >
              <div class="preset-browser-launch-content">
                <span class="preset-browser-launch-name">{{ currentPreset?.name ?? 'No preset selected' }}</span>
                <span class="preset-browser-launch-path">{{ currentPresetFolderPathLabel }}</span>
              </div>
            </v-btn>
            <div class="preset-state-pill" :class="{ dirty: isDirty }">
              <v-icon size="16">{{ isDirty ? 'mdi-circle-edit-outline' : 'mdi-check-circle-outline' }}</v-icon>
              <span>{{ isDirty ? 'Unsaved changes' : 'Saved' }}</span>
            </div>
            <v-menu v-model="presetMenuOpen" location="bottom end">
              <template #activator="{ props }">
                <v-btn v-bind="props" class="preset-menu-btn" color="secondary" variant="tonal" append-icon="mdi-chevron-down">
                  Preset Actions
                </v-btn>
              </template>
              <v-list density="compact" class="preset-action-menu">
                <v-list-item
                  title="Rename"
                  prepend-icon="mdi-form-textbox"
                  :disabled="!currentPreset"
                  @click="openRenamePresetDialog"
                />
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
              <div class="track-strip-heading" style="min-height:16px; height:16px;">
                <v-icon size="16">mdi-timeline-clock-outline</v-icon>
                <span>Tracks</span>
              </div>
              <v-btn
                class="track-add-btn"
                icon
                size="x-small"
                variant="flat"
                color="secondary"
                title="Add blank track"
                style="min-width:0; min-height:0; width:20px; height:20px; padding:0;"
                @click="addTrack"
              >
                <v-icon size="16">mdi-plus</v-icon>
                </v-btn>
          </div>

          <div class="track-timeline" aria-label="Track lengths in beats">
            <div
              v-for="entry in trackTimingEntries"
              :key="entry.track.id"
              role="button"
              tabindex="0"
              class="track-timeline-row"
              :class="{ selected: entry.track.id === selectedTrackId }"
              @click="handleTrackSelection(entry.track.id)"
              @keydown.enter.prevent="handleTrackSelection(entry.track.id)"
              @keydown.space.prevent="handleTrackSelection(entry.track.id)"
            >
              <div class="track-timeline-meta">
                <input
                  class="track-name-input"
                  :value="entry.track.name"
                  :aria-label="`Track name for ${entry.track.name || 'unnamed track'}`"
                  @click.stop
                  @focus="handleTrackSelection(entry.track.id)"
                  @input="handleTrackNameInput(entry.track.id, ($event.target as HTMLInputElement).value)"
                  @blur="commitTrackName(entry.track.id)"
                  @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                />
                <span>{{ formatBeats(entry.totalBeats) }} beats · {{ formatBars(entry.totalBars) }} bars</span>
              </div>
              <div class="track-timeline-bar">
                <span
                  v-if="entry.delayBeats > 0"
                  class="track-timeline-segment delay"
                  :style="{ flexGrow: entry.delayBeats }"
                  :title="`${formatBeats(entry.delayBeats)} beat delay`"
                ></span>
                <span
                  v-for="repeat in entry.repeatBlocks"
                  :key="repeat"
                  class="track-timeline-segment repeat"
                  :style="{ flexGrow: entry.patternBeats }"
                  :title="`Repeat ${repeat}: ${formatBeats(entry.patternBeats)} beats`"
                ></span>
                <span
                  v-if="entry.padBeats > 0"
                  class="track-timeline-segment pad"
                  :style="{ flexGrow: entry.padBeats }"
                  aria-hidden="true"
                ></span>
              </div>
              <div class="track-timeline-controls">
                <v-btn
                  class="track-mix-btn"
                  icon
                  size="x-small"
                  :variant="isTrackMuted(entry.track.id) ? 'tonal' : 'text'"
                  :color="isTrackMuted(entry.track.id) ? 'warning' : undefined"
                  :title="isTrackMuted(entry.track.id) ? `Unmute ${entry.track.name}` : `Mute ${entry.track.name}`"
                  @click.stop="toggleTrackMuted(entry.track.id)"
                >
                  <v-icon size="18">mdi-volume-off</v-icon>
                </v-btn>
                <v-btn
                  class="track-mix-btn"
                  icon
                  size="x-small"
                  :variant="isTrackSoloed(entry.track.id) ? 'tonal' : 'text'"
                  :color="isTrackSoloed(entry.track.id) ? 'primary' : undefined"
                  :title="isTrackSoloed(entry.track.id) ? `Unsolo ${entry.track.name}` : `Solo ${entry.track.name}`"
                  @click.stop="toggleTrackSoloed(entry.track.id)"
                >
                  <v-icon size="18">mdi-headphones</v-icon>
                </v-btn>
                <v-btn
                  class="track-delete-btn"
                  icon
                  size="x-small"
                  variant="text"
                  color="error"
                  :disabled="tracks.length <= 1"
                  :title="tracks.length <= 1 ? 'Cannot delete the only track' : `Delete ${entry.track.name}`"
                  @click.stop="removeTrack(entry.track.id)"
                >
                  <v-icon size="18">mdi-trash-can-outline</v-icon>
                </v-btn>
              </div>
            </div>
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

      <v-responsive class="editor-surface align-center mx-auto pa-2 pb-8">
        <div class="control-tabs-layout">
          <v-tabs v-model="activeControlTab" :direction="$vuetify.display.xs ? 'horizontal' : 'vertical'" class="control-tabs" color="primary">
            <v-tab value="sequence" prepend-icon="mdi-format-list-numbered">Sequence</v-tab>
            <v-tab value="playback" prepend-icon="mdi-play-circle-outline">Playback</v-tab>
            <v-tab value="tonewheel" prepend-icon="mdi-piano">Tonewheel</v-tab>
            <v-tab value="unison" prepend-icon="mdi-account-voice">Unison</v-tab>
            <v-tab value="modulation" prepend-icon="mdi-sine-wave">Modulation</v-tab>
            <v-tab value="filter" prepend-icon="mdi-filter-outline">Filter</v-tab>
            <v-tab value="drive" prepend-icon="mdi-lightning-bolt-outline">Tanh Drive</v-tab>
            <v-tab value="effects" prepend-icon="mdi-waveform">Effects</v-tab>
            <v-tab value="reverb" prepend-icon="mdi-weather-rainy">Global Reverb</v-tab>
          </v-tabs>

          <v-window v-model="activeControlTab" class="control-tab-content">
            <v-window-item value="sequence" class="control-tab-panel">
        <v-row>
          <v-col cols="12">
            <v-select
              v-model="trackWaveform"
              label="Tonewheel Waveform"
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

            </v-window-item>

            <v-window-item value="playback" class="control-tab-panel">
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
              :label="'Track Phase (' + Number(trackPhase).toFixed(2) + ')'"
              :min="0"
              :step="0.01"
              :max="1"
              v-model="trackPhase"
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
            </v-window-item>

            <v-window-item value="tonewheel" class="control-tab-panel">
        <v-row class="compact-row">
          <v-col cols="12" md="6">
            <EditableSlider :label="'Attack (' + Number(trackAttack).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="trackAttack" @update:modelValue="handleTrackDraftChange" />
          </v-col>
          <v-col cols="12" md="6">
            <EditableSlider :label="'Release (' + Number(trackRelease).toFixed(2) + 's)'" :min="0" :max="20" :step="0.01" v-model="trackRelease" @update:modelValue="handleTrackDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
        <v-col v-for="(label, index) in tonewheelDrawbarLabels" :key="label" cols="12" sm="6" md="4">
            <EditableSlider :label="label + ' Drawbar (' + trackTonewheelDrawbars[index] + ')'" :min="0" :max="8" :step="1" v-model="trackTonewheelDrawbars[index]" @update:modelValue="handleTrackDraftChange" />
        </v-col>
        </v-row>
          </v-window-item>

          <v-window-item value="unison" class="control-tab-panel">
             <v-row class="compact-row">
               <v-col cols="12" md="6">
                 <EditableSlider :label="'Unison Voices (' + trackUnisonVoices + ')'" :min="1" :max="8" :step="1" v-model="trackUnisonVoices" @update:modelValue="handleTrackDraftChange" />
               </v-col>
               <v-col cols="12" md="6">
                 <EditableSlider :label="'Unison Detune (' + Number(trackUnisonDetune).toFixed(0) + ' cents)'" :min="0" :max="100" :step="1" v-model="trackUnisonDetune" @update:modelValue="handleTrackDraftChange" />
               </v-col>
             </v-row>
            </v-window-item>

            <v-window-item value="modulation" class="control-tab-panel">
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
            </v-window-item>

            <v-window-item value="filter" class="control-tab-panel">
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
            </v-window-item>

            <v-window-item value="drive" class="control-tab-panel">
              <EditableSlider :label="'Tanh Drive (' + Number(trackLimiterGain).toFixed(1) + ' dB before tanh)'" :min="-48" :max="72" :step="0.1" v-model="trackLimiterGain" @update:modelValue="handleTrackDraftChange" />
            </v-window-item>

            <v-window-item value="effects" class="control-tab-panel">
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
            </v-window-item>

            <v-window-item value="reverb" class="control-tab-panel">
        <v-row>
          <v-col cols="12">
            <v-switch v-model="reverbEnabled" label="Enable High Quality Global Reverb" hide-details density="compact" @update:modelValue="handleReverbDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <EditableSlider :label="'Reverb Decay (' + Number(reverbDecay).toFixed(2) + 's)'" :min="0.1" :max="30" :step="0.1" v-model="reverbDecay" @update:modelValue="handleReverbDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Pre-delay (' + Number(reverbPreDelay).toFixed(2) + 's)'" :min="0" :max="1" :step="0.01" v-model="reverbPreDelay" @update:modelValue="handleReverbDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Dry Level (' + Number(reverbDry).toFixed(1) + ' dB)'" :min="-96" :max="12" :step="0.1" v-model="reverbDry" @update:modelValue="handleReverbDraftChange" />
          </v-col>
        </v-row>
        <v-row class="compact-row">
          <v-col cols="12" md="4">
            <EditableSlider :label="'Reverb Wet Return (' + Number(reverbWet).toFixed(1) + ' dB)'" :min="-96" :max="12" :step="0.1" v-model="reverbWet" @update:modelValue="handleReverbDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Reverb Low Cut (' + Number(reverbLowCut).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="reverbLowCut" @update:modelValue="handleReverbDraftChange" />
          </v-col>
          <v-col cols="12" md="4">
            <EditableSlider :label="'Reverb High Cut (' + Number(reverbHighCut).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="reverbHighCut" @update:modelValue="handleReverbDraftChange" />
          </v-col>
        </v-row>
            </v-window-item>
          </v-window>
        </div>

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

      <v-dialog v-model="showCreatePresetDialog" max-width="460px">
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">New Preset</v-card-title>
          <v-card-text>
            <v-text-field
              ref="createPresetInputRef"
              v-model="createPresetInput"
              label="Preset name"
              density="comfortable"
              variant="outlined"
              autofocus
              @keydown.enter.prevent="confirmCreatePreset"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="cancelCreatePreset">Cancel</v-btn>
            <v-btn color="primary" @click="confirmCreatePreset" :disabled="!canSubmitCreatePreset">Create</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showPresetBrowser" max-width="1120px" :fullscreen="$vuetify.display.xs">
        <v-card class="preset-browser-card">
          <v-card-title class="preset-browser-title">
            <div>
              <div class="text-h6">Preset Browser</div>
              <div class="text-caption preset-browser-subtitle">Browse folders, search presets, and manage your library.</div>
            </div>
            <v-spacer></v-spacer>
            <v-btn icon variant="text" @click="showPresetBrowser = false" title="Close preset browser">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </v-card-title>
          <v-card-text class="preset-browser-body">
            <div class="preset-browser-toolbar">
              <v-text-field
                v-model="presetBrowserSearch"
                density="compact"
                variant="outlined"
                hide-details
                prepend-inner-icon="mdi-magnify"
                label="Search presets or paths"
                class="preset-browser-search"
              />
              <v-btn color="secondary" variant="tonal" prepend-icon="mdi-folder-plus-outline" @click="createFolderInActivePresetFolder">
                New Folder
              </v-btn>
              <v-btn color="primary" variant="tonal" prepend-icon="mdi-plus-box-outline" @click="createPresetInActiveFolder">
                New Preset
              </v-btn>
            </div>

            <div class="preset-browser-layout">
              <div class="preset-browser-tree">
                <button
                  type="button"
                  class="preset-folder-row"
                  :class="{ active: activePresetFolderId === null }"
                  @click="selectPresetFolder(null)"
                >
                  <span class="preset-folder-row-title">/</span>
                </button>

                <div
                  v-for="row in presetBrowserTreeRows"
                  :key="row.folder.id"
                  class="preset-folder-row"
                  :class="{ active: activePresetFolderId === row.folder.id }"
                  :style="{ paddingLeft: `${10 + row.level * 14}px` }"
                >
                  <button
                    type="button"
                    class="preset-folder-expand"
                    :disabled="!row.hasChildren"
                    @click.stop="togglePresetFolderExpanded(row.folder.id)"
                  >
                    <v-icon size="16">{{ row.hasChildren ? (row.expanded ? 'mdi-chevron-down' : 'mdi-chevron-right') : 'mdi-circle-small' }}</v-icon>
                  </button>
                  <button
                    type="button"
                    class="preset-folder-row-label"
                    @click="selectPresetFolder(row.folder.id)"
                  >
                    {{ row.folder.name }}
                  </button>
                  <v-menu location="bottom end">
                    <template #activator="{ props }">
                      <v-btn v-bind="props" icon size="x-small" variant="text" class="preset-item-menu-btn" title="Folder actions">
                        <v-icon size="16">mdi-dots-horizontal</v-icon>
                      </v-btn>
                    </template>
                    <v-list density="compact" class="preset-action-menu">
                      <v-list-item title="New subfolder" prepend-icon="mdi-folder-plus-outline" @click="createFolderInPresetFolder(row.folder.id)" />
                      <v-list-item title="Rename folder" prepend-icon="mdi-form-textbox" @click="renamePresetFolder(row.folder.id)" />
                      <v-list-item title="Move folder" prepend-icon="mdi-folder-move-outline" @click="openMoveFolderDialog(row.folder.id)" />
                      <v-list-item title="Delete folder" prepend-icon="mdi-delete-outline" @click="deletePresetFolder(row.folder.id)" />
                    </v-list>
                  </v-menu>
                </div>
              </div>

              <div class="preset-browser-content">
                <div class="preset-browser-path-row">
                  <span class="preset-browser-path-label">Current folder</span>
                  <strong>{{ activePresetFolderPathLabel }}</strong>
                </div>

                <template v-if="presetBrowserSearch.trim().length > 0">
                  <div class="preset-browser-section-title">Search results</div>
                  <div v-if="presetBrowserSearchResults.length === 0" class="preset-browser-empty">No presets match your search.</div>
                  <div
                    v-for="entry in presetBrowserSearchResults"
                    :key="entry.preset.id"
                    class="preset-item-row"
                    :class="{ active: entry.preset.id === selectedPresetId }"
                  >
                    <button type="button" class="preset-item-load" @click="loadPresetFromBrowser(entry.preset.id)">
                      <span class="preset-item-name">{{ entry.preset.name }}</span>
                      <span class="preset-item-path">{{ entry.path }}</span>
                    </button>
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon size="x-small" variant="text" class="preset-item-menu-btn" title="Preset actions">
                          <v-icon size="16">mdi-dots-horizontal</v-icon>
                        </v-btn>
                      </template>
                      <v-list density="compact" class="preset-action-menu">
                        <v-list-item title="Load preset" prepend-icon="mdi-folder-open-outline" @click="loadPresetFromBrowser(entry.preset.id)" />
                        <v-list-item title="Rename preset" prepend-icon="mdi-form-textbox" @click="renamePresetFromBrowser(entry.preset.id)" />
                        <v-list-item title="Move preset" prepend-icon="mdi-folder-move-outline" @click="openMovePresetDialog(entry.preset.id)" />
                        <v-list-item title="Delete preset" prepend-icon="mdi-delete-outline" @click="deletePresetFromBrowser(entry.preset.id)" />
                      </v-list>
                    </v-menu>
                  </div>
                </template>

                <template v-else>
                  <div class="preset-browser-section-title">Folders</div>
                  <div v-if="activePresetChildFolders.length === 0" class="preset-browser-empty">No folders here yet.</div>
                  <div
                    v-for="folder in activePresetChildFolders"
                    :key="folder.id"
                    class="preset-item-row folder"
                  >
                    <button type="button" class="preset-item-load" @click="selectPresetFolder(folder.id)">
                      <span class="preset-item-name">{{ folder.name }}</span>
                      <span class="preset-item-path">Open folder</span>
                    </button>
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon size="x-small" variant="text" class="preset-item-menu-btn" title="Folder actions">
                          <v-icon size="16">mdi-dots-horizontal</v-icon>
                        </v-btn>
                      </template>
                      <v-list density="compact" class="preset-action-menu">
                        <v-list-item title="New subfolder" prepend-icon="mdi-folder-plus-outline" @click="createFolderInPresetFolder(folder.id)" />
                        <v-list-item title="Rename folder" prepend-icon="mdi-form-textbox" @click="renamePresetFolder(folder.id)" />
                        <v-list-item title="Move folder" prepend-icon="mdi-folder-move-outline" @click="openMoveFolderDialog(folder.id)" />
                        <v-list-item title="Delete folder" prepend-icon="mdi-delete-outline" @click="deletePresetFolder(folder.id)" />
                      </v-list>
                    </v-menu>
                  </div>

                  <div class="preset-browser-section-title">Presets</div>
                  <div v-if="activePresetFolderPresets.length === 0" class="preset-browser-empty">No presets in this folder.</div>
                  <div
                    v-for="preset in activePresetFolderPresets"
                    :key="preset.id"
                    class="preset-item-row"
                    :class="{ active: preset.id === selectedPresetId }"
                  >
                    <button type="button" class="preset-item-load" @click="loadPresetFromBrowser(preset.id)">
                      <span class="preset-item-name">{{ preset.name }}</span>
                    </button>
                    <v-menu location="bottom end">
                      <template #activator="{ props }">
                        <v-btn v-bind="props" icon size="x-small" variant="text" class="preset-item-menu-btn" title="Preset actions">
                          <v-icon size="16">mdi-dots-horizontal</v-icon>
                        </v-btn>
                      </template>
                      <v-list density="compact" class="preset-action-menu">
                        <v-list-item title="Load preset" prepend-icon="mdi-folder-open-outline" @click="loadPresetFromBrowser(preset.id)" />
                        <v-list-item title="Rename preset" prepend-icon="mdi-form-textbox" @click="renamePresetFromBrowser(preset.id)" />
                        <v-list-item title="Move preset" prepend-icon="mdi-folder-move-outline" @click="openMovePresetDialog(preset.id)" />
                        <v-list-item title="Delete preset" prepend-icon="mdi-delete-outline" @click="deletePresetFromBrowser(preset.id)" />
                      </v-list>
                    </v-menu>
                  </div>
                </template>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showMoveDestinationDialog" max-width="480px">
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">Move {{ moveDialogMode === 'folder' ? 'Folder' : 'Preset' }}</v-card-title>
          <v-card-text>
            <v-select
              v-model="moveDestinationFolderId"
              label="Destination folder"
              :items="availableMoveDestinationOptions"
              item-title="title"
              item-value="value"
              density="comfortable"
              variant="outlined"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="cancelMoveDialog">Cancel</v-btn>
            <v-btn color="primary" @click="confirmMoveDialog">Move</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showPresetBrowserNameDialog" max-width="460px">
        <v-card class="rename-dialog-card">
          <v-card-title class="text-h6">{{ presetBrowserNameDialogTitle }}</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="presetBrowserNameInput"
              label="Name"
              density="comfortable"
              variant="outlined"
              autofocus
              @keydown.enter.prevent="confirmPresetBrowserNameDialog"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn variant="text" @click="cancelPresetBrowserNameDialog">Cancel</v-btn>
            <v-btn color="primary" @click="confirmPresetBrowserNameDialog" :disabled="!canSubmitPresetBrowserNameDialog">Save</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

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
              <li><strong>Preset Browser</strong>: Open the preset browser to organize presets into nested folders, search by name/path, and move or delete folders and presets.</li>
              <li><strong>Forte number</strong>: The pitch-class set to use as Forte number with transposition (see
                <a target="_blank" href="https://en.wikipedia.org/wiki/List_of_set_classes">Forte numbers</a>).</li>
              <li><strong>BPM</strong>: Controls the tempo of the sequence.</li>
              <li><strong>Numerator/Denominator</strong>: Set per-track rhythmic grid while all tracks share one tempo.</li>
              <li><strong>Tracks</strong>: Each preset can contain multiple tracks with their own MIDI channel, waveform, gain, sequence, octave shift, note length, envelope, unison, modulation, filter, tanh drive, echo, and reverb send.</li>
              <li><strong>Waveform</strong>: Select from sine, square, triangle, or sawtooth waveforms per track.</li>
              <li><strong>Sequence</strong>: Input a sequence of numbers per track to generate notes based on their binary
                representation.</li>
              <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played for the selected track.</li>
              <li><strong>Track Gain</strong>: Sets each track's audio level in dB. Use the velocity multiplier to control MIDI note velocity independently.</li>
              <li><strong>Note length</strong>: Multiplies the durations of the selected track's notes.</li>
              <li><strong>Track Delay</strong>: Number of bars to wait before the track starts playing.</li>
              <li><strong>Track Repeats</strong>: Number of times the track's pattern is repeated. After its repeats, the track stays silent until the longest track finishes, then everything loops.</li>
              <li><strong>Track Length View</strong>: The track strip shows each track's delay, repeats, and total duration in beats/bars with compact selectable blocks.</li>
              <li><strong>Tanh Drive</strong>: Applies the selected dB gain before a tanh waveshaper, so high values amplify and distort while the final track signal remains softly bounded.</li>
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

    <v-footer class="donation-footer" app>
      <a
        class="donation-link"
        href="https://paypal.me/ncg7777"
        target="_blank"
        rel="noopener noreferrer"
      >
        <v-icon size="14">mdi-heart-outline</v-icon>
        <span>Support GateRunner</span>
      </a>
    </v-footer>

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
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { PCS12 } from 'ultra-mega-enumerator';
import {
  DEFAULT_PRESET_DATA,
  DEFAULT_PRESET_TRACK_DATA,
  ECHO_DELAY_OPTIONS,
  TONEWHEEL_DRAWBAR_LABELS,
  arePresetDataEqual,
  buildUniqueFolderName,
  buildUniquePresetNameInFolder,
  buildDraftFromUrl,
  buildPresetLibraryExport,
  buildSinglePresetExport,
  clonePresetData,
  clonePresetTrackData,
  createFolder,
  createNamedPreset,
  deleteFolderRecursive,
  deletePreset,
  getFolderPath,
  getSelectedPreset,
  hasUrlPresetOverrides,
  isFolderDescendant,
  listChildFolders,
  listFolderPresets,
  loadPresetLibrary,
  mergeImportedPresetLibrary,
  moveFolder,
  movePresetToFolder,
  normalizePresetData,
  normalizePresetTrackData,
  parsePresetImportPayload,
  renameFolder,
  renamePreset,
  sanitizePresetName,
  sanitizeTrackName,
  savePresetLibrary,
  updatePresetData,
  type NamedPreset,
  type EchoDelayValue,
  type PresetData,
  type PresetFolder,
  type PresetLibraryImportPayload,
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
  mixGain: Tone.Gain;
}

interface TrackMixState {
  muted: boolean;
  soloed: boolean;
}

interface ReverbAudioChain {
  lowCut: Tone.Filter;
  highCut: Tone.Filter;
  reverb: Tone.Reverb;
}

interface TrackTimingEntry {
  track: PresetTrackData;
  sequenceLength: number;
  numerator: number;
  denominator: number;
  repeats: number;
  delayBeats: number;
  patternBeats: number;
  activeBeats: number;
  totalBeats: number;
  totalBars: number;
  padBeats: number;
  repeatBlocks: number[];
}

interface PresetFolderTreeRow {
  folder: PresetFolder;
  level: number;
  expanded: boolean;
  hasChildren: boolean;
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
  },
  data() {
    const firstTrack = initialState.draft.tracks[0] ?? DEFAULT_PRESET_TRACK_DATA;
    return {
      bpm: initialState.draft.bpm,
      forte: initialState.draft.forte,
      tracks: initialState.draft.tracks.map((track) => clonePresetTrackData(track)) as PresetTrackData[],
      trackMixStates: {} as Record<string, TrackMixState>,
      selectedTrackId: initialState.selectedTrackId as string | null,
      trackNumerator: firstTrack.numerator,
      trackDenominator: firstTrack.denominator,
      trackPhase: firstTrack.phase,
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
      trackTonewheelDrawbars: firstTrack.tonewheelDrawbars.slice(),
      tonewheelDrawbarLabels: TONEWHEEL_DRAWBAR_LABELS,
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
      presetLibrary: initialState.presetLibrary as PresetLibrary,
      selectedPresetId: initialState.selectedPresetId as string | null,
      activePresetFolderId: initialState.selectedPresetFolderId as string | null,
      isDirty: initialState.isDirty,
      showPresetBrowser: false,
      presetBrowserSearch: '',
      expandedPresetFolderIds: [] as string[],
      showMoveDestinationDialog: false,
      moveDialogMode: null as 'preset' | 'folder' | null,
      moveTargetId: null as string | null,
      moveDestinationFolderId: null as string | null,
      showPresetBrowserNameDialog: false,
      presetBrowserNameDialogMode: null as 'new-folder' | 'rename-folder' | 'new-preset' | 'rename-preset' | null,
      presetBrowserNameDialogTargetId: null as string | null,
      presetBrowserNameDialogFolderId: null as string | null,
      presetBrowserNameInput: '',
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
      showRenamePresetDialog: false,
      renamePresetInput: '',
      showCreatePresetDialog: false,
      createPresetInput: '',
      isExporting: false,
      exportFormat: null as 'midi' | 'wav' | null,
      exportProgress: 0,
      exportStatus: '',
      transportMenuOpen: false,
      presetMenuOpen: false,
      controlDeckHeight: 0,
      controlDeckCollapsed: false,
      controlDeckResizeObserver: null as ResizeObserver | null,
      rebuildTrackLoopsTimer: null as number | null,
      activeControlTab: 'sequence',
    };
  },
  computed: {
    currentPreset(): NamedPreset | null {
      return this.presetLibrary.presets.find((preset) => preset.id === this.presetLibrary.selectedPresetId) ?? this.presetLibrary.presets[0] ?? null;
    },
    currentTrack(): PresetTrackData | null {
      return this.tracks.find((track) => track.id === this.selectedTrackId) ?? this.tracks[0] ?? null;
    },
    currentPresetFolderPath(): PresetFolder[] {
      return this.currentPreset ? getFolderPath(this.presetLibrary, this.currentPreset.folderId) : [];
    },
    currentPresetFolderPathLabel(): string {
      if (!this.currentPreset) {
        return '/';
      }
      const segments = this.currentPresetFolderPath.map((folder) => folder.name);
      return segments.length > 0 ? segments.join(' / ') : '/';
    },
    activePresetFolderPathLabel(): string {
      const segments = getFolderPath(this.presetLibrary, this.activePresetFolderId).map((folder) => folder.name);
      return segments.length > 0 ? segments.join(' / ') : '/';
    },
    presetBrowserTreeRows(): PresetFolderTreeRow[] {
      const childrenByParent = new Map<string | null, PresetFolder[]>();
      for (const folder of this.presetLibrary.folders) {
        const key = folder.parentFolderId;
        const existing = childrenByParent.get(key) ?? [];
        existing.push(folder);
        childrenByParent.set(key, existing);
      }

      for (const folders of childrenByParent.values()) {
        folders.sort((left, right) => left.name.localeCompare(right.name));
      }

      const expanded = new Set(this.expandedPresetFolderIds);
      const showAll = this.presetBrowserSearch.trim().length > 0;
      const rows: PresetFolderTreeRow[] = [];

      const walk = (parentFolderId: string | null, level: number) => {
        for (const folder of childrenByParent.get(parentFolderId) ?? []) {
          const hasChildren = (childrenByParent.get(folder.id)?.length ?? 0) > 0;
          const isExpanded = showAll || expanded.has(folder.id);
          rows.push({
            folder,
            level,
            expanded: isExpanded,
            hasChildren,
          });
          if (hasChildren && isExpanded) {
            walk(folder.id, level + 1);
          }
        }
      };

      walk(null, 0);
      return rows;
    },
    activePresetChildFolders(): PresetFolder[] {
      return listChildFolders(this.presetLibrary, this.activePresetFolderId)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    activePresetFolderPresets(): NamedPreset[] {
      return listFolderPresets(this.presetLibrary, this.activePresetFolderId)
        .slice()
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    presetBrowserSearchResults(): Array<{ preset: NamedPreset; path: string }> {
      const query = this.presetBrowserSearch.trim().toLowerCase();
      if (!query) {
        return [];
      }

      return this.presetLibrary.presets
        .filter((preset) => {
          const path = this.formatFolderPath(preset.folderId).toLowerCase();
          return preset.name.toLowerCase().includes(query) || path.includes(query);
        })
        .map((preset) => ({
          preset,
          path: this.formatFolderPath(preset.folderId),
        }))
        .sort((left, right) => left.preset.name.localeCompare(right.preset.name));
    },
    presetMoveDestinationOptions(): Array<{ title: string; value: string | null }> {
      const options: Array<{ title: string; value: string | null }> = [
        {
          title: '/',
          value: null,
        },
      ];

      for (const folder of this.presetLibrary.folders) {
        options.push({
          title: this.formatFolderPath(folder.id),
          value: folder.id,
        });
      }

      return options.sort((left, right) => left.title.localeCompare(right.title));
    },
    availableMoveDestinationOptions(): Array<{ title: string; value: string | null }> {
      if (this.moveDialogMode !== 'folder' || !this.moveTargetId) {
        return this.presetMoveDestinationOptions;
      }

      return this.presetMoveDestinationOptions.filter((option) => {
        if (option.value === this.moveTargetId) {
          return false;
        }
        if (!option.value) {
          return true;
        }
        return !isFolderDescendant(this.presetLibrary, this.moveTargetId!, option.value);
      });
    },
    presetBrowserNameDialogTitle(): string {
      if (this.presetBrowserNameDialogMode === 'new-folder') {
        return 'New Folder';
      }
      if (this.presetBrowserNameDialogMode === 'rename-folder') {
        return 'Rename Folder';
      }
      if (this.presetBrowserNameDialogMode === 'new-preset') {
        return 'New Preset';
      }
      if (this.presetBrowserNameDialogMode === 'rename-preset') {
        return 'Rename Preset';
      }
      return 'Name';
    },
    canSubmitPresetBrowserNameDialog(): boolean {
      return this.presetBrowserNameInput.trim().length > 0;
    },
    canSubmitPresetRename(): boolean {
      if (!this.currentPreset) {
        return false;
      }

      const nextName = sanitizePresetName(this.renamePresetInput);
      return nextName !== this.currentPreset.name;
    },
    canSubmitCreatePreset(): boolean {
      return this.createPresetInput.trim().length > 0;
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
    trackTimingEntries(): TrackTimingEntry[] {
      const entries = this.tracks.map((track) => {
        const sequenceLength = this.parseSequence(track.sequenceInput).length;
        const patternBeats = sequenceLength / Math.max(1, track.denominator);
        const delayBeats = track.delay * track.numerator;
        const activeBeats = patternBeats * track.repeats;
        const totalBeats = delayBeats + activeBeats;
        const totalBars = track.numerator > 0 ? totalBeats / track.numerator : 0;
        return {
          track,
          sequenceLength,
          numerator: track.numerator,
          denominator: track.denominator,
          repeats: track.repeats,
          delayBeats,
          patternBeats,
          activeBeats,
          totalBeats,
          totalBars,
          padBeats: 0,
          repeatBlocks: Array.from({ length: track.repeats }, (_, index) => index + 1),
        };
      });
      const maxBeats = Math.max(1, ...entries.map((entry) => entry.totalBeats));
      return entries.map((entry) => ({
        ...entry,
        padBeats: Math.max(0, maxBeats - entry.totalBeats),
      }));
    },
    selectedTrackTiming(): TrackTimingEntry | null {
      return this.trackTimingEntries.find((entry) => entry.track.id === this.selectedTrackId) ?? this.trackTimingEntries[0] ?? null;
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
    syncTrackEditorFromCurrent() {
      const track = this.currentTrack;
      if (!track) {
        return;
      }

      this.trackNumerator = track.numerator;
      this.trackDenominator = track.denominator;
      this.trackPhase = track.phase;
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
      this.trackTonewheelDrawbars = track.tonewheelDrawbars.slice();
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
        phase: this.trackPhase,
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
        tonewheelDrawbars: this.trackTonewheelDrawbars,
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
      this.syncTrackEditorFromCurrent();
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
      this.syncTrackEditorFromCurrent();
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
    handleTrackDraftChange() {
      const previousTrack = this.currentTrack ? clonePresetTrackData(this.currentTrack) : null;
      this.applyTrackEditorToCurrent();
      const nextTrack = this.currentTrack;
      this.refreshDirtyState();

      if (!nextTrack) {
        return;
      }

      if (this.isRunning && previousTrack && this.didTrackTimingChange(previousTrack, nextTrack)) {
        this.scheduleTrackLoopRebuild();
      }

      this.updateSynths(nextTrack.id, false);
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
    formatBeats(value: number): string {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    },
    formatBars(value: number): string {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
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
          wet: this.reverbEnabled ? 1 : 0,
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
      this.syncTrackEditorFromCurrent();
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
      const currentPreset = this.currentPreset;
      this.isDirty = currentPreset ? !arePresetDataEqual(this.getDraftData(), currentPreset.data) : false;
    },
    formatFolderPath(folderId: string | null): string {
      const segments = getFolderPath(this.presetLibrary, folderId).map((folder) => folder.name);
      return segments.length > 0 ? segments.join(' / ') : '/';
    },
    openPresetBrowser() {
      this.activePresetFolderId = this.currentPreset?.folderId ?? this.activePresetFolderId ?? null;
      this.showPresetBrowser = true;
    },
    selectPresetFolder(folderId: string | null) {
      this.activePresetFolderId = folderId;
      if (folderId && !this.expandedPresetFolderIds.includes(folderId)) {
        this.expandedPresetFolderIds = [...this.expandedPresetFolderIds, folderId];
      }
    },
    togglePresetFolderExpanded(folderId: string) {
      if (this.expandedPresetFolderIds.includes(folderId)) {
        this.expandedPresetFolderIds = this.expandedPresetFolderIds.filter((id) => id !== folderId);
      } else {
        this.expandedPresetFolderIds = [...this.expandedPresetFolderIds, folderId];
      }
    },
    openPresetBrowserNameDialog(
      mode: 'new-folder' | 'rename-folder' | 'new-preset' | 'rename-preset',
      options: {
        targetId?: string | null;
        folderId?: string | null;
        initialName?: string;
      } = {},
    ) {
      this.presetBrowserNameDialogMode = mode;
      this.presetBrowserNameDialogTargetId = options.targetId ?? null;
      this.presetBrowserNameDialogFolderId = options.folderId ?? null;
      this.presetBrowserNameInput = options.initialName ?? '';
      this.showPresetBrowserNameDialog = true;
    },
    cancelPresetBrowserNameDialog() {
      this.showPresetBrowserNameDialog = false;
      this.presetBrowserNameDialogMode = null;
      this.presetBrowserNameDialogTargetId = null;
      this.presetBrowserNameDialogFolderId = null;
      this.presetBrowserNameInput = '';
    },
    confirmPresetBrowserNameDialog() {
      if (!this.canSubmitPresetBrowserNameDialog || !this.presetBrowserNameDialogMode) {
        return;
      }

      const value = this.presetBrowserNameInput;
      if (this.presetBrowserNameDialogMode === 'new-folder') {
        const result = createFolder(this.presetLibrary, value, this.presetBrowserNameDialogFolderId);
        this.persistPresetLibrary(result.library);
        this.activePresetFolderId = result.folder.id;
        if (!this.expandedPresetFolderIds.includes(result.folder.id)) {
          this.expandedPresetFolderIds = [...this.expandedPresetFolderIds, result.folder.id];
        }
      } else if (this.presetBrowserNameDialogMode === 'rename-folder' && this.presetBrowserNameDialogTargetId) {
        this.persistPresetLibrary(renameFolder(this.presetLibrary, this.presetBrowserNameDialogTargetId, value));
      } else if (this.presetBrowserNameDialogMode === 'new-preset') {
        const folderId = this.presetBrowserNameDialogFolderId;
        const name = this.buildUniquePresetName(value, folderId);
        const preset = {
          ...createNamedPreset(name, DEFAULT_PRESET_DATA),
          folderId,
        };
        this.persistPresetLibrary({
          ...this.presetLibrary,
          presets: [...this.presetLibrary.presets, preset],
        });
      } else if (this.presetBrowserNameDialogMode === 'rename-preset' && this.presetBrowserNameDialogTargetId) {
        this.persistPresetLibrary(renamePreset(this.presetLibrary, this.presetBrowserNameDialogTargetId, value));
      }

      this.cancelPresetBrowserNameDialog();
    },
    createFolderInPresetFolder(parentFolderId: string | null) {
      const suggestedName = buildUniqueFolderName(this.presetLibrary, 'New folder', parentFolderId);
      this.openPresetBrowserNameDialog('new-folder', {
        folderId: parentFolderId,
        initialName: suggestedName,
      });
    },
    createFolderInActivePresetFolder() {
      this.createFolderInPresetFolder(this.activePresetFolderId);
    },
    renamePresetFolder(folderId: string) {
      const folder = this.presetLibrary.folders.find((entry) => entry.id === folderId);
      if (!folder) {
        return;
      }

      const suggested = buildUniqueFolderName(this.presetLibrary, folder.name, folder.parentFolderId, folder.id);
      this.openPresetBrowserNameDialog('rename-folder', {
        targetId: folderId,
        folderId: folder.parentFolderId,
        initialName: suggested,
      });
    },
    async deletePresetFolder(folderId: string) {
      const folder = this.presetLibrary.folders.find((entry) => entry.id === folderId);
      if (!folder) {
        return;
      }

      const result = deleteFolderRecursive(this.presetLibrary, folderId);
      if (result.deletedFolderIds.length === 0) {
        return;
      }

      const shouldDelete = await this.askForConfirmation(
        'Delete Folder',
        `Delete folder "${folder.name}" and ${result.deletedFolderIds.length - 1} subfolder(s), plus ${result.deletedPresetIds.length} preset(s)? This cannot be undone.`,
        'Delete',
      );
      if (!shouldDelete) {
        return;
      }

      const deletedCurrentPreset = this.currentPreset ? result.deletedPresetIds.includes(this.currentPreset.id) : false;
      if (deletedCurrentPreset && !(await this.confirmDiscardChanges('Delete this folder subtree and discard them'))) {
        return;
      }

      this.persistPresetLibrary(result.library);
      this.activePresetFolderId = null;

      if (deletedCurrentPreset && result.selectedPresetId) {
        this.loadPresetById(result.selectedPresetId, result.library);
      } else {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
      }
    },
    createPresetInActiveFolder() {
      const folderId = this.activePresetFolderId;
      const suggested = buildUniquePresetNameInFolder(this.presetLibrary, 'New preset', folderId);
      this.openPresetBrowserNameDialog('new-preset', {
        folderId,
        initialName: suggested,
      });
    },
    renamePresetFromBrowser(presetId: string) {
      const preset = this.presetLibrary.presets.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }

      const suggested = buildUniquePresetNameInFolder(this.presetLibrary, preset.name, preset.folderId, preset.id);
      this.openPresetBrowserNameDialog('rename-preset', {
        targetId: presetId,
        folderId: preset.folderId,
        initialName: suggested,
      });
      if (this.currentPreset?.id === presetId) {
        this.selectedPresetId = presetId;
      }
    },
    async deletePresetFromBrowser(presetId: string) {
      const preset = this.presetLibrary.presets.find((entry) => entry.id === presetId);
      if (!preset) {
        return;
      }

      const shouldDelete = await this.askForConfirmation('Delete Preset', `Delete preset "${preset.name}"? This cannot be undone.`, 'Delete');
      if (!shouldDelete) {
        return;
      }

      const deletingCurrent = this.currentPreset?.id === presetId;
      if (deletingCurrent && !(await this.confirmDiscardChanges(`Delete preset "${preset.name}" and discard them`))) {
        return;
      }

      const result = deletePreset(this.presetLibrary, presetId);
      this.persistPresetLibrary(result.library);
      if (deletingCurrent && result.selectedPresetId) {
        this.loadPresetById(result.selectedPresetId, result.library);
      }
    },
    openMovePresetDialog(presetId: string) {
      this.moveDialogMode = 'preset';
      this.moveTargetId = presetId;
      const preset = this.presetLibrary.presets.find((entry) => entry.id === presetId);
      this.moveDestinationFolderId = preset?.folderId ?? null;
      this.showMoveDestinationDialog = true;
    },
    openMoveFolderDialog(folderId: string) {
      this.moveDialogMode = 'folder';
      this.moveTargetId = folderId;
      const folder = this.presetLibrary.folders.find((entry) => entry.id === folderId);
      this.moveDestinationFolderId = folder?.parentFolderId ?? null;
      this.showMoveDestinationDialog = true;
    },
    cancelMoveDialog() {
      this.showMoveDestinationDialog = false;
      this.moveDialogMode = null;
      this.moveTargetId = null;
      this.moveDestinationFolderId = null;
    },
    confirmMoveDialog() {
      if (!this.moveDialogMode || !this.moveTargetId) {
        this.cancelMoveDialog();
        return;
      }

      if (this.moveDialogMode === 'preset') {
        this.persistPresetLibrary(movePresetToFolder(this.presetLibrary, this.moveTargetId, this.moveDestinationFolderId));
      } else {
        this.persistPresetLibrary(moveFolder(this.presetLibrary, this.moveTargetId, this.moveDestinationFolderId));
      }

      this.cancelMoveDialog();
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
    openCreatePresetDialog() {
      this.createPresetInput = this.buildUniquePresetName('New preset', this.activePresetFolderId);
      this.showCreatePresetDialog = true;
      this.focusCreatePresetInput();
    },
    focusCreatePresetInput() {
      this.$nextTick(() => {
        window.requestAnimationFrame(() => {
          const input = (this.$refs.createPresetInputRef as { $el?: HTMLElement } | undefined)?.$el?.querySelector('input') as HTMLInputElement | null;
          input?.focus();
          input?.select();
        });
      });
    },
    cancelCreatePreset() {
      this.showCreatePresetDialog = false;
      this.createPresetInput = '';
    },
    confirmCreatePreset() {
      if (!this.canSubmitCreatePreset) {
        return;
      }

      const folderId = this.activePresetFolderId;
      const name = this.buildUniquePresetName(this.createPresetInput, folderId);
      const preset = {
        ...createNamedPreset(name, DEFAULT_PRESET_DATA),
        folderId,
      };
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, preset],
        selectedPresetId: preset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = preset.id;
      this.applyDraftData(preset.data);
      this.refreshDirtyState();
      this.cancelCreatePreset();
    },
    persistPresetLibrary(library: PresetLibrary) {
      this.presetLibrary = library;
      savePresetLibrary(library);

      if (this.activePresetFolderId && !library.folders.some((folder) => folder.id === this.activePresetFolderId)) {
        this.activePresetFolderId = null;
      }
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
      this.activePresetFolderId = preset.folderId;
      this.applyDraftData(preset.data);
      this.refreshDirtyState();
    },
    handleDraftChange() {
      this.applyRealtimeSettings();
      this.refreshDirtyState();
    },
    handleReverbDraftChange() {
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
    async handlePresetSelection(nextPresetId: string | null) {
      const currentPresetId = this.presetLibrary.selectedPresetId;
      if (!nextPresetId || nextPresetId === currentPresetId) {
        return;
      }

      if (!(await this.confirmDiscardChanges('Load another preset and discard them'))) {
        this.selectedPresetId = currentPresetId;
        return;
      }

      this.loadPresetById(nextPresetId);
    },
    async loadPresetFromBrowser(presetId: string) {
      const before = this.presetLibrary.selectedPresetId;
      await this.handlePresetSelection(presetId);
      if (this.presetLibrary.selectedPresetId !== before) {
        this.showPresetBrowser = false;
      }
    },
    buildUniquePresetName(baseName: string, folderId: string | null, excludedPresetId?: string): string {
      return buildUniquePresetNameInFolder(this.presetLibrary, baseName, folderId, excludedPresetId);
    },
    renameCurrentPreset(baseName?: string) {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      const nextName = this.buildUniquePresetName(baseName ?? currentPreset.name, currentPreset.folderId, currentPreset.id);
      if (nextName === currentPreset.name) {
        return;
      }

      const nextLibrary = renamePreset(this.presetLibrary, currentPreset.id, nextName);
      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = currentPreset.id;
      const renamed = nextLibrary.presets.find((preset) => preset.id === currentPreset.id);
      this.showNotice(`Renamed preset to "${renamed?.name ?? nextName}".`, 'success');
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
      this.showNotice(`Saved preset "${updatedPreset.name}".`, 'success');
    },
    async saveAsPreset() {
      const folderId = this.currentPreset?.folderId ?? null;
      const suggestedName = this.buildUniquePresetName(`${this.currentPreset?.name ?? 'Preset'} Copy`, folderId);
      const requestedName = await this.askForTextInput({
        title: 'Save Preset Copy',
        label: 'Preset name',
        initialValue: suggestedName,
        confirmLabel: 'Create',
      });
      if (requestedName === null) {
        return;
      }

      const name = this.buildUniquePresetName(requestedName, folderId);
      const newPreset = {
        ...createNamedPreset(name, this.getDraftData()),
        folderId,
      };
      const nextLibrary: PresetLibrary = {
        ...this.presetLibrary,
        presets: [...this.presetLibrary.presets, newPreset],
        selectedPresetId: newPreset.id,
      };

      this.persistPresetLibrary(nextLibrary);
      this.selectedPresetId = newPreset.id;
      this.applyDraftData(newPreset.data);
      this.refreshDirtyState();
      this.showNotice(`Created preset "${newPreset.name}".`, 'success');
    },
    async createNewPreset() {
      this.presetMenuOpen = false;
      if (!(await this.confirmDiscardChanges('Create a new preset and discard them'))) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      this.activePresetFolderId = this.currentPreset?.folderId ?? null;

      this.$nextTick(() => {
        this.openCreatePresetDialog();
      });
    },
    async deleteCurrentPreset() {
      const currentPreset = this.currentPreset;
      if (!currentPreset) {
        return;
      }

      if (!(await this.confirmDiscardChanges(`Delete preset "${currentPreset.name}" and discard them`))) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      const shouldDelete = await this.askForConfirmation('Delete Preset', `Delete preset "${currentPreset.name}"? This cannot be undone.`, 'Delete');
      if (!shouldDelete) {
        this.selectedPresetId = this.presetLibrary.selectedPresetId;
        return;
      }

      const result = deletePreset(this.presetLibrary, currentPreset.id);
      this.persistPresetLibrary(result.library);
      const fallbackPreset = result.library.presets.find((preset) => preset.id === result.selectedPresetId) ?? result.library.presets[0];
      this.selectedPresetId = fallbackPreset.id;
      this.activePresetFolderId = fallbackPreset.folderId;
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
        const importedLibrary: PresetLibraryImportPayload = payload.kind === 'single-preset'
          ? {
            version: payload.version,
            kind: 'preset-library',
            exportedAt: payload.exportedAt,
            selectedPresetId: payload.preset.id,
            folders: [],
            presets: [payload.preset],
          }
          : payload;
        const mergeResult = mergeImportedPresetLibrary(this.presetLibrary, importedLibrary, {
          preferredSelectedPresetId: importedLibrary.selectedPresetId,
          singlePresetDestinationFolderId: payload.kind === 'single-preset' ? this.activePresetFolderId : undefined,
        });
        const nextLibrary: PresetLibrary = {
          ...mergeResult.library,
          selectedPresetId: this.presetLibrary.selectedPresetId,
        };

        this.persistPresetLibrary(nextLibrary);
        this.selectedPresetId = this.presetLibrary.selectedPresetId;

        const importedCount = mergeResult.importedPresets.length;
        if (importedCount === 0) {
          this.showNotice('No presets were imported.', 'warning');
          return;
        }

        if (mergeResult.selectedPresetId && await this.confirmDiscardChanges('Load the imported preset and discard them')) {
          this.loadPresetById(mergeResult.selectedPresetId, nextLibrary);
        } else {
          this.selectedPresetId = this.presetLibrary.selectedPresetId;
        }

        this.showNotice(`Imported ${importedCount} preset${importedCount === 1 ? '' : 's'}.`, 'success');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to import preset file.';
        this.showNotice(message, 'error');
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
        wet: this.reverbEnabled ? 1 : 0,
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
      const mixGain = markRaw(new Tone.Gain(1));
      const dryGain = markRaw(new Tone.Gain(1).toDestination());
      const reverbSend = markRaw(new Tone.Gain(0));

      tremolo.start();
      synth.chain(filter, outputGain, vibrato, tremolo, echo, limiterGain, limiter);
      limiter.connect(mixGain);
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
      return track.unisonVoices > 1 ? 'fatcustom' : 'custom';
    },
    getTonewheelPartials(track: PresetTrackData): number[] {
      const partialIndices = [1, 3, 2, 4, 6, 8, 10, 12, 16];
      const maximumPartial = 64;
      const partials = Array.from({ length: maximumPartial }, () => 0);
      const waveform = this.getWaveformType(track.waveform);

      const addWaveformHarmonics = (basePartial: number, amplitude: number) => {
        for (let harmonic = 1; basePartial * harmonic <= maximumPartial; harmonic += 1) {
          if (waveform === 'sine' && harmonic > 1) {
            continue;
          }
          if (waveform === 'square' && harmonic % 2 === 0) {
            continue;
          }
          if (waveform === 'triangle' && harmonic % 2 === 0) {
            continue;
          }

          const harmonicAmplitude = waveform === 'triangle'
            ? (Math.floor(harmonic / 2) % 2 === 0 ? 1 : -1) / (harmonic * harmonic)
            : waveform === 'sawtooth'
              ? -1 / harmonic
              : waveform === 'square'
                ? 1 / harmonic
                : 1;
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
      chain.mixGain.dispose();
    },
    updateReverbChain() {
      const chain = this.getOrCreateReverbChain();
      chain.lowCut.set({ frequency: this.midiToFrequency(this.reverbLowCut) });
      chain.highCut.set({ frequency: this.midiToFrequency(this.reverbHighCut) });
      chain.reverb.set({
        decay: this.reverbDecay,
        preDelay: this.reverbPreDelay,
        wet: this.reverbEnabled ? 1 : 0,
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
        chain.filter.frequency.setValueAtTime(this.getTrackFilterFrequency(track, arr), when);
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

.preset-panel {
  overflow-x: auto;
}

.preset-inline-row {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  min-width: 760px;
}

.preset-browser-launch {
  width: 100%;
  min-height: 40px;
  justify-content: flex-start;
  padding-inline: 10px;
}

.preset-browser-launch-content {
  min-width: 0;
  display: grid;
  line-height: 1.15;
  text-align: left;
}

.preset-browser-launch-name {
  font-weight: 700;
  color: #f3fbff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-browser-launch-path {
  color: rgba(201, 241, 255, 0.7);
  font-size: 0.73rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-state-pill {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(135, 211, 230, 0.35);
  border-radius: 0;
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

.preset-menu-btn {
  min-width: 164px;
}

.preset-action-menu {
  min-width: 240px;
  border: 1px solid rgba(139, 213, 231, 0.3);
  background: rgba(4, 12, 17, 0.96);
}

.preset-browser-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background: #000000;
}

.preset-browser-title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.preset-browser-subtitle {
  color: rgba(201, 241, 255, 0.7);
}

.preset-browser-body {
  display: grid;
  gap: 10px;
  max-height: 72vh;
}

.preset-browser-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
}

.preset-browser-search {
  min-width: 0;
}

.preset-browser-layout {
  min-height: 420px;
  display: grid;
  grid-template-columns: minmax(230px, 0.9fr) minmax(0, 1.4fr);
  gap: 10px;
}

.preset-browser-tree,
.preset-browser-content {
  border: 1px solid rgba(127, 211, 231, 0.24);
  background: rgba(2, 10, 15, 0.65);
  overflow: auto;
}

.preset-browser-tree {
  padding: 7px;
}

.preset-browser-content {
  padding: 10px;
  display: grid;
  align-content: start;
  gap: 7px;
}

.preset-browser-path-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: baseline;
  color: rgba(234, 248, 255, 0.88);
  border-bottom: 1px solid rgba(127, 211, 231, 0.2);
  padding-bottom: 5px;
}

.preset-browser-path-label {
  color: rgba(201, 241, 255, 0.7);
  font-size: 0.78rem;
}

.preset-browser-section-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(201, 241, 255, 0.72);
  margin-top: 2px;
}

.preset-browser-empty {
  font-size: 0.83rem;
  color: rgba(201, 241, 255, 0.68);
  padding: 6px 8px;
  border: 1px dashed rgba(127, 211, 231, 0.28);
}

.preset-folder-row {
  width: 100%;
  min-height: 31px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(238, 250, 255, 0.9);
  text-align: left;
  padding: 1px 4px;
}

.preset-folder-row.active {
  border-color: rgba(0, 255, 209, 0.56);
  background: rgba(0, 255, 209, 0.12);
}

.preset-folder-expand {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: rgba(225, 247, 255, 0.8);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.preset-folder-expand:disabled {
  opacity: 0.42;
}

.preset-folder-row-label {
  width: 100%;
  border: none;
  background: transparent;
  color: inherit;
  text-align: left;
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-folder-row-title {
  grid-column: 2;
  font-size: 0.84rem;
  font-weight: 700;
}

.preset-item-row {
  min-height: 38px;
  border: 1px solid rgba(127, 211, 231, 0.2);
  background: rgba(8, 22, 31, 0.55);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
}

.preset-item-row.active {
  border-color: rgba(0, 255, 209, 0.56);
  background: rgba(0, 255, 209, 0.1);
}

.preset-item-row.folder {
  background: rgba(8, 22, 31, 0.4);
}

.preset-item-load {
  border: none;
  background: transparent;
  color: #e9f9ff;
  padding: 7px 9px;
  text-align: left;
  display: grid;
  gap: 1px;
}

.preset-item-name {
  font-size: 0.87rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-item-path {
  font-size: 0.72rem;
  color: rgba(201, 241, 255, 0.68);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preset-item-menu-btn {
  margin-right: 2px;
}

.track-strip {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0;
  align-items: center;
  padding: 0;
}

.track-strip-heading {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(236, 248, 255, 0.9);
  font-weight: 700;
  font-size: 0.78rem;
  line-height: 1;
  min-height: 16px;
  height: 16px;
}

.track-add-btn {
  box-shadow: 0 0 16px rgba(255, 79, 163, 0.18);
  height: 20px !important;
  width: 20px !important;
  min-height: 20px !important;
  min-width: 20px !important;
  padding: 0 !important;
  margin: 0;
}

.track-add-btn .v-btn__content {
  height: 20px !important;
  width: 20px !important;
  min-height: 20px !important;
  min-width: 20px !important;
  line-height: 20px !important;
  padding: 0 !important;
}

.track-timeline {
  margin-top: 6px;
  display: grid;
  gap: 3px;
}

.track-timeline-row {
  width: 100%;
  min-height: 30px;
  display: grid;
  grid-template-columns: minmax(132px, 0.34fr) minmax(160px, 1fr) auto;
  gap: 6px;
  align-items: center;
  padding: 1px 6px;
  border: 1px solid rgba(124, 208, 228, 0.24);
  border-radius: 0;
  color: #e9f9ff;
  background: linear-gradient(90deg, rgba(3, 11, 16, 0.52), rgba(16, 22, 46, 0.4));
  cursor: pointer;
  text-align: left;
}

.track-timeline-row.selected {
  border-color: rgba(0, 255, 209, 0.76);
  background:
    linear-gradient(90deg, rgba(0, 255, 209, 0.16), rgba(255, 79, 163, 0.12)),
    rgba(8, 18, 28, 0.72);
  box-shadow: inset 0 0 18px rgba(0, 255, 209, 0.1), 0 0 14px rgba(0, 255, 209, 0.12);
}

.track-timeline-controls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.track-timeline-meta {
  min-width: 0;
  display: grid;
  gap: 1px;
}

.track-timeline-meta span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.track-name-input {
  width: 100%;
  min-width: 0;
  color: #f9fdff;
  font: inherit;
  font-weight: 800;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0;
  padding: 1px 5px;
  outline: none;
}

.track-name-input:hover,
.track-name-input:focus {
  border-color: rgba(0, 255, 209, 0.42);
  background: rgba(0, 255, 209, 0.08);
  box-shadow: 0 0 12px rgba(0, 255, 209, 0.12);
}

.track-timeline-meta span {
  color: rgba(220, 247, 255, 0.74);
  font-size: 0.76rem;
}

.track-timeline-bar {
  min-width: 0;
  height: 14px;
  display: flex;
  gap: 3px;
  padding: 2px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.28);
}

.track-timeline-segment {
  min-width: 5px;
  border-radius: 0;
}

.track-timeline-segment.delay {
  background: repeating-linear-gradient(
    135deg,
    rgba(150, 171, 183, 0.58),
    rgba(150, 171, 183, 0.58) 4px,
    rgba(94, 112, 124, 0.38) 4px,
    rgba(94, 112, 124, 0.38) 8px
  );
}

.track-timeline-segment.repeat {
  background: linear-gradient(90deg, rgba(0, 255, 209, 0.94), rgba(255, 79, 163, 0.82), rgba(244, 216, 76, 0.86));
}

.track-delete-btn {
  opacity: 0.76;
}

.track-delete-btn:hover,
.track-delete-btn:focus-visible {
  opacity: 1;
}

.track-timeline-segment.pad {
  min-width: 0;
  background: rgba(124, 208, 228, 0.1);
}

.selected-track-duration-card {
  margin: 6px 0 6px;
  display: grid;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid rgba(124, 208, 228, 0.28);
  border-radius: 0;
  color: rgba(232, 248, 255, 0.86);
  background: rgba(3, 11, 16, 0.42);
  font-size: 0.9rem;
}

.selected-track-duration-card > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #f4fbff;
}

.duration-label {
  color: rgba(220, 247, 255, 0.74);
}

.preset-file-input {
  display: none;
}

.control-deck-spacer {
  width: 100%;
  pointer-events: none;
}

.editor-surface {
  width: min(1120px, calc(100vw - 20px));
  background: #000000;
  border: 1px solid rgba(122, 206, 226, 0.24);
  border-radius: 0;
  box-shadow: 0 0 28px rgba(0, 255, 209, 0.08), 0 24px 40px rgba(0, 0, 0, 0.32);
}

.control-tabs-layout {
  display: grid;
  grid-template-columns: 188px minmax(0, 1fr);
  min-height: 470px;
  border: 1px solid rgba(127, 211, 231, 0.26);
  background: #000000;
}

.control-tabs {
  border-right: 1px solid rgba(127, 211, 231, 0.26);
  background: rgba(3, 11, 16, 0.62);
}

.control-tabs :deep(.v-tab) {
  justify-content: flex-start;
  min-height: 44px;
  padding-inline: 14px;
  color: rgba(220, 247, 255, 0.76);
}

.control-tabs :deep(.v-tab--selected) {
  color: #f4fbff;
  background: rgba(0, 255, 209, 0.1);
}

.control-tab-content {
  min-width: 0;
}

.control-tab-panel {
  padding: 12px 14px 6px;
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

.control-tab-panel :deep(.v-row) {
  margin-top: 0;
  margin-bottom: 7px;
}

.control-tab-panel :deep(.v-col) {
  padding-top: 2px;
  padding-bottom: 2px;
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

.export-dialog-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background: #000000;
}

.rename-dialog-card {
  border: 1px solid rgba(132, 209, 228, 0.32);
  background: #000000;
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

  .editor-surface {
    width: calc(100vw - 16px);
  }

  .dependent-settings-row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  .preset-inline-row {
    min-width: 700px;
  }

  .preset-browser-layout {
    grid-template-columns: minmax(200px, 0.9fr) minmax(0, 1.2fr);
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

  .editor-surface {
    width: calc(100vw - 10px);
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

  .preset-panel {
    overflow-x: visible;
  }

  .preset-inline-row {
    min-width: 0;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "selector state"
      "menu menu";
    column-gap: 6px;
    row-gap: 8px;
  }

  .preset-select {
    grid-area: selector;
  }

  .preset-browser-launch {
    grid-area: selector;
  }

  .preset-state-pill {
    grid-area: state;
    font-size: 0.75rem;
    padding: 6px 10px;
  }

  .preset-menu-btn {
    grid-area: menu;
    width: 100%;
    min-width: 0;
  }

  .preset-browser-body {
    min-height: 0;
    max-height: none;
    grid-template-rows: auto minmax(0, 1fr);
    overflow: hidden;
  }

  .preset-browser-toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preset-browser-search {
    grid-column: 1 / -1;
  }

  .preset-browser-layout {
    min-height: 0;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) minmax(88px, 20vh);
    grid-template-areas:
      "content"
      "tree";
    overflow: hidden;
  }

  .preset-browser-card {
    height: 100dvh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
  }

  .preset-browser-title {
    min-height: 56px;
    padding-block: 10px;
    align-items: center;
  }

  .preset-browser-subtitle {
    display: none;
  }

  .preset-browser-tree {
    grid-area: tree;
  }

  .preset-browser-content {
    grid-area: content;
  }

  .track-strip {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .control-tabs-layout {
    grid-template-columns: minmax(0, 1fr);
    min-height: 0;
  }

  .control-tabs {
    border-right: none;
    border-bottom: 1px solid rgba(127, 211, 231, 0.26);
  }

  .control-tabs :deep(.v-slide-group__container) {
    overflow-x: auto;
  }

  .control-tabs :deep(.v-slide-group__content) {
    flex-wrap: nowrap;
  }

  .control-tabs :deep(.v-tab) {
    flex: 0 0 auto;
    min-height: 40px;
    padding-inline: 10px;
  }

  .control-tab-panel {
    padding: 10px 12px 5px;
  }

  .track-timeline-row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "meta controls"
      "bar bar";
    gap: 2px;
    min-height: 40px;
    padding: 1px 6px;
  }

  .track-timeline-meta {
    grid-area: meta;
    gap: 2px;
  }

  .track-timeline-bar {
    grid-area: bar;
    height: 10px;
    padding: 1px;
  }

  .track-delete-btn {
    grid-area: delete;
  }

  .track-timeline-controls {
    grid-area: controls;
  }

  .selected-track-duration-card {
    margin-left: 0;
    margin-right: 0;
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
    border-radius: 0;
    padding: 12px !important;
  }
}
</style>