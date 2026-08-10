<template>
  <v-responsive class="editor-surface align-center mx-auto pa-2 pb-8">
    <div class="control-tabs-layout">
      <v-tabs v-model="activeControlTab" :direction="$vuetify.display.xs ? 'horizontal' : 'vertical'" class="control-tabs" color="primary">
        <v-tab value="sequence" prepend-icon="mdi-format-list-numbered">Sequence</v-tab>
        <v-tab value="playback" prepend-icon="mdi-play-circle-outline">Playback</v-tab>
        <v-tab value="time-warp" prepend-icon="mdi-chart-sankey">Time Warp</v-tab>
        <v-tab value="tonewheel" prepend-icon="mdi-piano">Tonewheel</v-tab>
        <v-tab value="phase-distortion" prepend-icon="mdi-chart-timeline-variant">Phase Distortion</v-tab>
        <v-tab value="envelope" prepend-icon="mdi-chart-bell-curve-cumulative">Envelope</v-tab>
        <v-tab value="unison" prepend-icon="mdi-account-voice">Unison</v-tab>
        <v-tab value="modulation" prepend-icon="mdi-sine-wave">Tremolo/Vibrato</v-tab>
        <v-tab value="drive" prepend-icon="mdi-lightning-bolt-outline">Tanh Drive</v-tab>
        <v-tab value="chorus" prepend-icon="mdi-blur">Chorus</v-tab>
        <v-tab value="flanger" prepend-icon="mdi-waves">Flanger</v-tab>
        <v-tab value="phaser" prepend-icon="mdi-vector-curve">Phaser</v-tab>
        <v-tab value="filter" prepend-icon="mdi-filter-outline">Filter</v-tab>
        <v-tab value="effects" prepend-icon="mdi-waveform">Echo &amp; Sends</v-tab>
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
                :min="0"
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
                :label="'Fixed Note Length (+' + Number(draftTrack.lengthOffset).toFixed(2) + ' steps)'"
                :min="0"
                :max="64"
                :step="0.01"
                v-model="draftTrack.lengthOffset"
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

        <v-window-item value="time-warp" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch
                v-model="draftTrack.timeWarpEnabled"
                label="Enable Time Warp"
                hide-details
                density="compact"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch
                v-model="draftTrack.timeWarpNoteLengths"
                label="Warp note lengths"
                hide-details
                density="compact"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <v-autocomplete
                v-model="draftTrack.timeWarpCurve"
                label="Warp curve"
                :items="timeWarpCurveOptions"
                hide-details="auto"
                density="comfortable"
                variant="outlined"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row v-if="draftTrack.timeWarpCurve === customTimeWarpCurve">
            <v-col cols="12">
              <v-text-field
                v-model="draftTrack.timeWarpExpression"
                label="Custom expression"
                placeholder="Y=T+sin(PI*T)*0.125"
                hide-details="auto"
                density="comfortable"
                variant="outlined"
                :error="timeWarpExpressionError.length > 0"
                :error-messages="timeWarpExpressionError"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Warp chunks (' + draftTrack.timeWarpRepeats + ')'"
                :min="1"
                :max="64"
                :step="1"
                v-model="draftTrack.timeWarpRepeats"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Warp amount (' + Number(draftTrack.timeWarpAmount).toFixed(0) + '%)'"
                :min="0"
                :max="100"
                :step="1"
                v-model="draftTrack.timeWarpAmount"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="draftTrack.timeWarpQuantize"
                label="Grid quantize"
                :items="timeWarpQuantizeOptions"
                hide-details="auto"
                density="comfortable"
                variant="outlined"
                :disabled="!draftTrack.timeWarpEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <TimeWarpPreview
                :curve="draftTrack.timeWarpCurve"
                :expression="draftTrack.timeWarpExpression"
                :amount="draftTrack.timeWarpAmount"
                :steps="Math.max(1, selectedTrackSequenceLength)"
                :repeats="draftTrack.timeWarpRepeats"
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
            <v-col v-for="(label, index) in tonewheelDrawbarLabels" :key="label" cols="12" sm="6" md="4">
              <EditableSlider :label="label + ' Drawbar (' + draftTrack.tonewheelDrawbars[index] + ')'" :min="0" :max="8" :step="1" v-model="draftTrack.tonewheelDrawbars[index]" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="phase-distortion" class="control-tab-panel">
          <v-row class="compact-row">
            <v-col cols="12">
              <EditableSlider
                :label="'Base Skew (' + Number(draftTrack.skew).toFixed(2) + ')'"
                :min="0.01"
                :max="0.99"
                :step="0.01"
                v-model="draftTrack.skew"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.skewLfoEnabled" label="Skew LFO" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.skewLfoSync" label="Tempo Sync" hide-details density="compact" :disabled="!draftTrack.skewLfoEnabled" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <v-select
                v-if="draftTrack.skewLfoSync"
                v-model="draftTrack.skewLfoRate"
                :label="'LFO Rate ' + formatModulationRate(draftTrack.skewLfoRate)"
                :items="modulationRateOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                :disabled="!draftTrack.skewLfoEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
              <EditableSlider
                v-else
                :label="'LFO Rate (' + Number(draftTrack.skewLfoRateHz).toFixed(2) + ' Hz)'"
                :min="0.01"
                :max="20"
                :step="0.01"
                v-model="draftTrack.skewLfoRateHz"
                :disabled="!draftTrack.skewLfoEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider
                :label="'LFO Depth (' + Number(draftTrack.skewLfoAmount).toFixed(2) + ')'"
                :min="-1"
                :max="1"
                :step="0.01"
                v-model="draftTrack.skewLfoAmount"
                :disabled="!draftTrack.skewLfoEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <v-select
                v-model="draftTrack.skewLfoWaveform"
                label="LFO Waveform"
                :items="skewLfoWaveformOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                :disabled="!draftTrack.skewLfoEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider
                :label="'LFO Init Phase (' + Number(draftTrack.skewLfoInitPhase).toFixed(2) + ')'"
                :min="0"
                :max="0.99"
                :step="0.01"
                v-model="draftTrack.skewLfoInitPhase"
                :disabled="!draftTrack.skewLfoEnabled"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="envelope" class="control-tab-panel">
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Attack (' + Number(draftTrack.attack).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="draftTrack.attack" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Decay (' + Number(draftTrack.decay).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="draftTrack.decay" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Sustain (' + Number(draftTrack.sustain).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.sustain" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Release (' + Number(draftTrack.release).toFixed(2) + 's)'" :min="0" :max="20" :step="0.01" v-model="draftTrack.release" @update:modelValue="handleTrackDraftChange" />
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

        <v-window-item value="drive" class="control-tab-panel">
          <EditableSlider :label="'Tanh Drive (' + Number(draftTrack.limiterGain).toFixed(1) + ' dB before tanh)'" :min="-48" :max="72" :step="0.1" v-model="draftTrack.limiterGain" @update:modelValue="handleTrackDraftChange" />
        </v-window-item>

        <v-window-item value="chorus" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.chorusEnabled" label="Enable Chorus" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="draftTrack.chorusRate"
                :label="'Chorus Rate ' + formatModulationRate(draftTrack.chorusRate)"
                :items="modulationRateOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <EditableSlider :label="'Chorus Delay (' + Number(draftTrack.chorusDelay).toFixed(2) + ' ms)'" :min="0.5" :max="20" :step="0.05" v-model="draftTrack.chorusDelay" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Chorus Depth (' + Number(draftTrack.chorusDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.chorusDepth" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Chorus Spread (' + Number(draftTrack.chorusSpread).toFixed(0) + '°)'" :min="0" :max="180" :step="1" v-model="draftTrack.chorusSpread" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Chorus Feedback (' + Number(draftTrack.chorusFeedback).toFixed(2) + ')'" :min="0" :max="0.95" :step="0.01" v-model="draftTrack.chorusFeedback" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Chorus Wet (' + Number(draftTrack.chorusWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="draftTrack.chorusWet" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="flanger" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.flangerEnabled" label="Enable Flanger" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="draftTrack.flangerRate"
                :label="'Flanger Rate ' + formatModulationRate(draftTrack.flangerRate)"
                :items="modulationRateOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <EditableSlider :label="'Flanger Delay (' + Number(draftTrack.flangerDelay).toFixed(2) + ' ms)'" :min="0.1" :max="20" :step="0.05" v-model="draftTrack.flangerDelay" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Flanger Depth (' + Number(draftTrack.flangerDepth).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.flangerDepth" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Flanger Feedback (' + Number(draftTrack.flangerFeedback).toFixed(2) + ')'" :min="0" :max="0.95" :step="0.01" v-model="draftTrack.flangerFeedback" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Flanger Wet (' + Number(draftTrack.flangerWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="draftTrack.flangerWet" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
        </v-window-item>

        <v-window-item value="phaser" class="control-tab-panel">
          <v-row>
            <v-col cols="12" md="6">
              <v-switch v-model="draftTrack.phaserEnabled" label="Enable Phaser" hide-details density="compact" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="draftTrack.phaserRate"
                :label="'Phaser Rate ' + formatModulationRate(draftTrack.phaserRate)"
                :items="modulationRateOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <v-select
                v-model="draftTrack.phaserStages"
                label="Phaser Stages"
                :items="phaserStageOptions"
                hide-details
                density="comfortable"
                variant="outlined"
                @update:modelValue="handleTrackDraftChange"
              />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Phaser Base (' + Number(draftTrack.phaserBaseFrequency).toFixed(2) + ' MIDI)'" :min="0" :max="127" :step="0.01" v-model="draftTrack.phaserBaseFrequency" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Phaser Sweep (' + Number(draftTrack.phaserOctaves).toFixed(2) + ' octaves)'" :min="0.1" :max="8" :step="0.01" v-model="draftTrack.phaserOctaves" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Phaser Q (' + Number(draftTrack.phaserQ).toFixed(2) + ')'" :min="0.01" :max="30" :step="0.01" v-model="draftTrack.phaserQ" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Phaser Wet (' + Number(draftTrack.phaserWet).toFixed(1) + ' dB)'" :min="-96" :max="0" :step="0.1" v-model="draftTrack.phaserWet" @update:modelValue="handleTrackDraftChange" />
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
          <v-row class="compact-row">
            <v-col cols="12" md="4">
              <EditableSlider :label="'Filter Env Amount (' + Number(draftTrack.filterEnvelopeAmount).toFixed(1) + ' MIDI)'" :min="-127" :max="127" :step="0.1" v-model="draftTrack.filterEnvelopeAmount" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Filter Env Attack (' + Number(draftTrack.filterEnvelopeAttack).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="draftTrack.filterEnvelopeAttack" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="4">
              <EditableSlider :label="'Filter Env Decay (' + Number(draftTrack.filterEnvelopeDecay).toFixed(2) + 's)'" :min="0" :max="10" :step="0.01" v-model="draftTrack.filterEnvelopeDecay" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
          <v-row class="compact-row">
            <v-col cols="12" md="6">
              <EditableSlider :label="'Filter Env Sustain (' + Number(draftTrack.filterEnvelopeSustain).toFixed(2) + ')'" :min="0" :max="1" :step="0.01" v-model="draftTrack.filterEnvelopeSustain" @update:modelValue="handleTrackDraftChange" />
            </v-col>
            <v-col cols="12" md="6">
              <EditableSlider :label="'Filter Env Release (' + Number(draftTrack.filterEnvelopeRelease).toFixed(2) + 's)'" :min="0" :max="20" :step="0.01" v-model="draftTrack.filterEnvelopeRelease" @update:modelValue="handleTrackDraftChange" />
            </v-col>
          </v-row>
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
import TimeWarpPreview from './TimeWarpPreview.vue';
import {
  CUSTOM_TIME_WARP_CURVE,
  TIME_WARP_CURVE_OPTIONS,
  TIME_WARP_QUANTIZE_OPTIONS,
  resolveTimeWarpFunction,
} from '../audio/timeWarp';
import {
  clonePresetTrackData,
  DEFAULT_PRESET_TRACK_DATA,
  ECHO_DELAY_OPTIONS,
  MODULATION_RATE_OPTIONS,
  PHASER_STAGE_OPTIONS,
  SKEW_LFO_WAVEFORM_OPTIONS,
  TONEWHEEL_DRAWBAR_LABELS,
  WAVEFORM_OPTIONS,
  type ModulationRateValue,
  type PresetReverbData,
  type PresetTrackData,
} from '../presets';

export default defineComponent({
  name: 'EditorSurface',
  components: {
    EditableSlider,
    ReverbControls,
    TimeWarpPreview,
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
    bpm: {
      type: Number,
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
      modulationRateOptions: MODULATION_RATE_OPTIONS,
      phaserStageOptions: [...PHASER_STAGE_OPTIONS] as number[],
      waveformOptions: WAVEFORM_OPTIONS,
      skewLfoWaveformOptions: SKEW_LFO_WAVEFORM_OPTIONS,
      customTimeWarpCurve: CUSTOM_TIME_WARP_CURVE,
      timeWarpCurveOptions: [
        { title: 'Custom expression', value: CUSTOM_TIME_WARP_CURVE },
        ...TIME_WARP_CURVE_OPTIONS.map((option) => ({
          title: `${option.group} - ${option.title}`,
          value: option.value,
        })).sort((left, right) => left.title.localeCompare(right.title, undefined, { numeric: true })),
      ],
      timeWarpQuantizeOptions: TIME_WARP_QUANTIZE_OPTIONS.map((value) => ({
        title: value === 0 ? 'Off' : `${value} subdivisions per step`,
        value,
      })),
      activeControlTab: 'sequence',
    };
  },
  computed: {
    selectedTrackSequenceLength(): number {
      return this.parseSequence(this.draftTrack.sequenceInput).length;
    },
    timeWarpExpressionError(): string {
      if (!this.draftTrack.timeWarpEnabled || this.draftTrack.timeWarpCurve !== CUSTOM_TIME_WARP_CURVE) {
        return '';
      }

      const resolution = resolveTimeWarpFunction(this.draftTrack.timeWarpCurve, this.draftTrack.timeWarpExpression);
      return resolution.error ?? '';
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
    /** Shows the tempo-synced LFO cycle length translated into Hz at the current tempo. */
    formatModulationRate(rate: ModulationRateValue): string {
      const match = rate.match(/^(\d+)\/(\d+)([DT])?$/);
      if (!match) {
        return '';
      }

      const modifierRatio = match[3] === 'D' ? 1.5 : match[3] === 'T' ? 2 / 3 : 1;
      const cycleSeconds = (240 / this.bpm) * (Number(match[1]) / Number(match[2])) * modifierRatio;
      return `(${(1 / cycleSeconds).toFixed(3)} Hz)`;
    },
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