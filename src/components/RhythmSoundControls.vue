<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  DRUM_VOICE_OPTIONS,
  drumVoiceIcon,
  getDrumParameterDefinitions,
  normalizeDrumLanes,
  type DrumParameterDefinition,
} from '../domain/rhythmTrack';
import { clonePresetTrackData, type PresetTrackData } from '../presets';

const props = defineProps<{
  track: PresetTrackData;
}>();

const emit = defineEmits<{
  'update:track': [track: PresetTrackData];
}>();

const selectedLaneIndex = ref(0);
const selectedLane = computed(() => props.track.drumLanes[selectedLaneIndex.value] ?? props.track.drumLanes[0] ?? null);
const selectedParameterDefinitions = computed<readonly DrumParameterDefinition[]>(() => (
  selectedLane.value ? getDrumParameterDefinitions(selectedLane.value.voiceId) : []
));

watch(() => props.track.drumLanes.length, (length) => {
  if (length === 0) {
    selectedLaneIndex.value = 0;
  } else if (selectedLaneIndex.value >= length) {
    selectedLaneIndex.value = length - 1;
  }
});

function updateParameter(definition: DrumParameterDefinition, value: unknown): void {
  const lane = selectedLane.value;
  if (!lane || (typeof value !== 'number' && typeof value !== 'string')) {
    return;
  }

  const nextTrack = clonePresetTrackData(props.track);
  nextTrack.drumLanes = normalizeDrumLanes(props.track.drumLanes.map((entry, laneIndex) => laneIndex === selectedLaneIndex.value
    ? { voiceId: entry.voiceId, parameters: { ...entry.parameters, [definition.name]: value } }
    : entry));
  emit('update:track', nextTrack);
}

function parameterValue(definition: DrumParameterDefinition): number | string {
  return selectedLane.value?.parameters[definition.name] ?? '';
}

function voiceLabel(voiceId: string): string {
  return DRUM_VOICE_OPTIONS.find((option) => option.value === voiceId)?.title ?? voiceId;
}
</script>

<template>
  <div class="sound-controls">
    <v-alert type="info" variant="tonal" density="compact" class="sound-note">
      Select a lane below, then shape only that synthesized GM voice. Changes apply live or rebuild that voice once editing settles, without rewiring the track graph.
    </v-alert>

    <v-tabs v-model="selectedLaneIndex" color="primary" show-arrows class="sound-lane-tabs">
      <v-tab
        v-for="(lane, laneIndex) in track.drumLanes"
        :key="lane.voiceId"
        :value="laneIndex"
        :prepend-icon="drumVoiceIcon(lane.voiceId)"
      >
        {{ laneIndex + 1 }} · {{ voiceLabel(lane.voiceId) }}
      </v-tab>
    </v-tabs>

    <div v-if="selectedLane" class="selected-voice-heading">
      <v-icon size="18">{{ drumVoiceIcon(selectedLane.voiceId) }}</v-icon>
      <span>{{ voiceLabel(selectedLane.voiceId) }}</span>
      <span class="selected-voice-midi">GM {{ DRUM_VOICE_OPTIONS.find((option) => option.value === selectedLane?.voiceId)?.midi }}</span>
    </div>

    <v-row v-if="selectedLane" class="compact-row parameter-grid">
      <v-col v-for="definition in selectedParameterDefinitions" :key="definition.name" cols="12" sm="6" md="4">
        <v-select
          v-if="definition.kind === 'select'"
          :model-value="String(parameterValue(definition))"
          :label="definition.label"
          :items="definition.options"
          density="compact"
          variant="outlined"
          hide-details="auto"
          @update:model-value="updateParameter(definition, $event)"
        />
        <v-slider
          v-else
          :model-value="Number(parameterValue(definition))"
          :label="definition.label"
          :min="definition.min"
          :max="definition.max"
          :step="definition.step"
          thumb-label
          hide-details="auto"
          @update:model-value="updateParameter(definition, $event)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<style scoped>
.sound-controls {
  display: grid;
  gap: 10px;
}

.sound-note {
  font-size: 0.78rem;
}

.sound-lane-tabs {
  border: 1px solid rgba(124, 208, 228, 0.22);
  background: rgba(4, 12, 18, 0.72);
}

.selected-voice-heading {
  display: flex;
  align-items: baseline;
  gap: 8px;
  color: #f4fbff;
  font-size: 0.9rem;
  font-weight: 800;
}

.selected-voice-midi {
  color: rgba(176, 226, 237, 0.7);
  font-size: 0.76rem;
  font-weight: 600;
}

.parameter-grid {
  margin-top: 0;
}

@media (max-width: 680px) {
  .sound-lane-tabs :deep(.v-tab) {
    min-width: max-content;
    padding-inline: 10px;
  }
}
</style>
