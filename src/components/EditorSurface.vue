<template>
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

      <v-window v-model="activeControlTab" :touch="false" class="control-tab-content">
        <v-window-item value="sequence" class="control-tab-panel">
          <v-row>
            <v-col cols="12">
              <v-text-field
                :label="`Sequence (${selectedTrackSequenceLength})`"
                v-model="draftTrack.sequenceInput"
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
                :label="'Track Numerator (' + draftTrack.numerator + ')'"
                :min="1"
                :step="1"
                :max="16"
                v-model="draftTrack.numerator"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Denominator (' + draftTrack.denominator + ')'"
                :min="1"
                :step="1"
                :max="16"
                v-model="draftTrack.denominator"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Phase (' + Number(draftTrack.phase).toFixed(2) + ')'"
                :min="0"
                :step="0.01"
                :max="1"
                v-model="draftTrack.phase"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Octave shift (' + draftTrack.octave + ')'"
                :min="0"
                :step="1"
                :max="10"
                v-model="draftTrack.octave"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Note Length (' + draftTrack.lengthFactor + '%)'"
                :min="1"
                :max="400"
                :step="1"
                v-model="draftTrack.lengthFactor"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Gain (' + Number(draftTrack.gain).toFixed(1) + ' dB)'"
                :min="-96"
                :max="24"
                :step="0.1"
                v-model="draftTrack.gain"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Velocity Multiplier (' + Number(draftTrack.velocityMultiplier).toFixed(2) + 'x)'"
                :min="0"
                :max="4"
                :step="0.01"
                v-model="draftTrack.velocityMultiplier"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track MIDI Channel (' + draftTrack.midiChannel + ')'"
                :min="1"
                :max="16"
                :step="1"
                v-model="draftTrack.midiChannel"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Delay (' + draftTrack.delay + ' bars)'"
                :min="0"
                :max="64"
                :step="1"
                v-model="draftTrack.delay"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Track Repeats (' + draftTrack.repeats + ')'"
                :min="1"
                :max="64"
                :step="1"
                v-model="draftTrack.repeats"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="tonewheel" class="control-tab-panel">
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="draftTrack.waveform"
                label="Waveform"
                :items="waveformOptions"
                hide-details="auto"
                density="comfortable"
                variant="outlined"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Attack (' + Number(draftTrack.attack).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="draftTrack.attack" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Release (' + Number(draftTrack.release).toFixed(2) + 's)'" :min="0" :max="20" :step="0.01" v-model="draftTrack.release" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col v-for="(label, index) in tonewheelDrawbarLabels" :key="label" cols="12" sm="6" md="4">
              <EditableSlider :label="label + ' Drawbar (' + draftTrack.tonewheelDrawbars[index] + ')'" :min="0" :max="8" :step="1" v-model="draftTrack.tonewheelDrawbars[index]" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="unison" class="control-tab-panel">
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Unison Voices (' + draftTrack.unisonVoices + ')'" :min="1" :max="8" :step="1" v-model="draftTrack.unisonVoices" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Unison Detune (' + Number(draftTrack.unisonDetune).toFixed(0) + ' cents)'" :min="0" :max="100" :step="1" v-model="draftTrack.unisonDetune" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="modulation" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.tremoloEnabled" label="Tremolo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.vibratoEnabled" label="Vibrato" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <EditableSlider :label="'Tremolo Rate (' + Number(draftTrack.tremoloFrequency).toFixed(2) + ' Hz)'" :min="0.01" :max="40" :step="0.01" v-model="draftTrack.tremoloFrequency" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Tremolo Depth (' + Number(draftTrack.tremoloDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.tremoloDepth" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Tremolo Spread (' + Number(draftTrack.tremoloSpread).toFixed(0) + '°)'" :min="0" :max="360" :step="1" v-model="draftTrack.tremoloSpread" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Vibrato Rate (' + Number(draftTrack.vibratoFrequency).toFixed(2) + ' Hz)'" :min="0.01" :max="40" :step="0.01" v-model="draftTrack.vibratoFrequency" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Vibrato Depth (' + Number(draftTrack.vibratoDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.vibratoDepth" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="filter" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.filterEnabled" label="Enable Filter" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="draftTrack.filterType" label="Filter Mode" :items="['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking']" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <EditableSlider :label="'Cutoff/Base (' + Number(draftTrack.filterFrequency).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="draftTrack.filterFrequency" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Q (' + Number(draftTrack.filterQ).toFixed(2) + ')'" :min="0.01" :max="30" :step="0.01" v-model="draftTrack.filterQ" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Key Follow (' + Number(draftTrack.filterKeyFollow).toFixed(0) + '%)'" :min="-200" :max="200" :step="1" v-model="draftTrack.filterKeyFollow" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Filter Gain (' + Number(draftTrack.filterGain).toFixed(1) + ' dB)'" :min="-48" :max="48" :step="0.1" v-model="draftTrack.filterGain" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select v-model="draftTrack.filterRolloff" label="Rolloff" :items="[-12, -24, -48, -96]" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="drive" class="control-tab-panel">
          <EditableSlider :label="'Tanh Drive (' + Number(draftTrack.limiterGain).toFixed(1) + ' dB before tanh)'" :min="-48" :max="72" :step="0.1" v-model="draftTrack.limiterGain" @update:modelValue="handleTrackDraftChange" />
        </v-window-item>

        <v-window-item value="effects" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.echoEnabled" label="Feedback Stereo Echo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.echoPingPong" label="Ping-pong echo" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <v-select v-model="draftTrack.echoDelay" label="Echo Delay" :items="echoDelayOptions" hide-details density="comfortable" variant="outlined" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Echo Feedback (' + Number(draftTrack.echoFeedback).toFixed(2) + ')'" :min="0" :max="0.95" :step="0.01" v-model="draftTrack.echoFeedback" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Echo Wet (' + Number(draftTrack.echoWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="draftTrack.echoWet" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Track Reverb Send (' + Number(draftTrack.reverbWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="draftTrack.reverbWet" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="reverb" class="control-tab-panel">
          <ReverbControls
            v-model:enabled="draftReverb.enabled"
            v-model:decay="draftReverb.decay"
            v-model:pre-delay="draftReverb.preDelay"
            v-model:dry="draftReverb.dry"
            v-model:wet="draftReverb.wet"
            v-model:low-cut="draftReverb.lowCut"
            v-model:high-cut="draftReverb.highCut"
            @change="handleReverbDraftChange"
          />
        </v-window-item>
      </v-window>
    </div>
  </v-responsive>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import EditableSlider from './EditableSlider.vue';
import ReverbControls from './ReverbControls.vue';
import {
  clonePresetTrackData,
  DEFAULT_PRESET_TRACK_DATA,
  ECHO_DELAY_OPTIONS,
  TONEWHEEL_DRAWBAR_LABELS,
  WAVEFORM_OPTIONS,
  type PresetReverbData,
  type PresetTrackData,
} from '../presets';

export default defineComponent({
  name: 'EditorSurface',
  components: {
    EditableSlider,
    ReverbControls,
  },
  props: {
    track: {
      type: Object as PropType<PresetTrackData | null>,
      default: null,
    },
    reverb: {
      type: Object as PropType<PresetReverbData>,
      required: true,
    },
  },
  emits: ['track-change', 'reverb-change'],
  data() {
    return {
      draftTrack: clonePresetTrackData(this.track ?? DEFAULT_PRESET_TRACK_DATA),
      draftReverb: { ...this.reverb },
      tonewheelDrawbarLabels: TONEWHEEL_DRAWBAR_LABELS,
      echoDelayOptions: ECHO_DELAY_OPTIONS,
      waveformOptions: WAVEFORM_OPTIONS,
      activeControlTab: 'sequence',
    };
  },
  computed: {
    selectedTrackSequenceLength(): number {
      return this.parseSequence(this.draftTrack.sequenceInput).length;
    },
  },
  watch: {
    track: {
      deep: true,
      immediate: true,
      handler(nextTrack: PresetTrackData | null) {
        if (nextTrack) {
          this.draftTrack = clonePresetTrackData(nextTrack);
        }
      },
    },
    reverb: {
      deep: true,
      immediate: true,
      handler(nextReverb: PresetReverbData) {
        this.draftReverb = { ...nextReverb };
      },
    },
  },
  methods: {
    parseSequence(sequenceInput: string): number[] {
      return sequenceInput
        .trim()
        .split(/\s+/)
        .map((value: string) => Number.parseInt(value.trim(), 10))
        .filter((value: number) => !Number.isNaN(value));
    },
    handleTrackDraftChange() {
      this.$emit('track-change', clonePresetTrackData(this.draftTrack));
    },
    handleReverbDraftChange() {
      this.$emit('reverb-change', { ...this.draftReverb });
    },
  },
});
</script>

<style scoped>
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

.compact-row {
  margin-top: -4px;
}

@media (max-width: 960px) {
  .editor-surface {
    width: calc(100vw - 16px);
  }
}

@media (max-width: 680px) {
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
    width: calc(100vw - 10px);
    border-radius: 0;
    padding: 12px !important;
  }
}
</style>