<template>
  <div>
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
        @click="$emit('add-track')"
      >
        <v-icon size="16">mdi-plus</v-icon>
      </v-btn>
    </div>

    <div class="track-activation">
      <button
        type="button"
        class="track-activation-toggle"
        :aria-expanded="activationExpanded ? 'true' : 'false'"
        @click="activationExpanded = !activationExpanded"
      >
        <v-icon size="16">{{ activationExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
        <span>Track Activation (B)</span>
        <span class="track-activation-status">{{ activationStatusLabel }}</span>
      </button>

      <div v-show="activationExpanded" class="track-activation-body">
        <v-text-field
          :model-value="bitmaskSequenceInput"
          label="Bitmask sequence B"
          placeholder="e.g. 1 2 3 0 (blank = off)"
          hide-details="auto"
          density="compact"
          variant="outlined"
          :error-messages="activationErrorMessages"
          @update:model-value="onBitmaskSequenceInput"
        />
        <p class="track-activation-help">
          Optional. Space-separated nonnegative decimal masks split the full song loop into equal chunks.
          Bit 0 = first track. Blank disables gating.
        </p>
      </div>
    </div>

    <div class="track-timeline" aria-label="Track lengths in beats">
      <div
        v-for="entry in trackTimingEntries"
        :key="entry.track.id"
        role="button"
        tabindex="0"
        class="track-timeline-row"
        :class="{ selected: entry.track.id === selectedTrackId }"
        @click="$emit('select-track', entry.track.id)"
        @keydown.enter.prevent="$emit('select-track', entry.track.id)"
        @keydown.space.prevent="$emit('select-track', entry.track.id)"
      >
        <div class="track-timeline-meta">
          <input
            class="track-name-input"
            :value="entry.track.name"
            :aria-label="`Track name for ${entry.track.name || 'unnamed track'}`"
            @click.stop
            @focus="$emit('select-track', entry.track.id)"
            @input="$emit('track-name-input', entry.track.id, ($event.target as HTMLInputElement).value)"
            @blur="$emit('commit-track-name', entry.track.id)"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          />
          <span>{{ formatBeats(entry.totalBeats) }} beats · {{ formatBars(entry.totalBars) }} bars</span>
        </div>
        <div class="track-timeline-bar">
          <div class="track-timeline-segments">
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
          <div
            v-if="entry.chunkStates.length > 0"
            class="track-activation-overlay"
            aria-hidden="true"
          >
            <span
              v-for="(active, chunkIndex) in entry.chunkStates"
              :key="`chunk-${entry.track.id}-${chunkIndex}`"
              class="track-activation-chunk"
              :class="{ inactive: !active }"
              :title="chunkTooltip(entry, chunkIndex, active)"
            ></span>
          </div>
        </div>
        <div class="track-timeline-controls">
          <v-btn
            class="track-mix-btn"
            icon
            size="x-small"
            :variant="isTrackMuted(entry.track.id) ? 'tonal' : 'text'"
            :color="isTrackMuted(entry.track.id) ? 'warning' : undefined"
            :title="isTrackMuted(entry.track.id) ? `Unmute ${entry.track.name}` : `Mute ${entry.track.name}`"
            @click.stop="$emit('toggle-muted', entry.track.id)"
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
            @click.stop="$emit('toggle-soloed', entry.track.id)"
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
            @click.stop="$emit('remove-track', entry.track.id)"
          >
            <v-icon size="18">mdi-trash-can-outline</v-icon>
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue';
import type { PresetTrackData } from '../presets';
import {
  buildTrackChunkActivationStates,
  parseBitmaskSequenceInput,
} from '../trackActivation';

export interface TrackMixState {
  muted: boolean;
  soloed: boolean;
}

export interface TrackTimingEntry {
  track: PresetTrackData;
  trackIndex: number;
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
  chunkStates: boolean[];
}

export default defineComponent({
  name: 'TrackStrip',
  props: {
    tracks: {
      type: Array as PropType<PresetTrackData[]>,
      required: true,
    },
    selectedTrackId: {
      type: String as PropType<string | null>,
      default: null,
    },
    trackMixStates: {
      type: Object as PropType<Record<string, TrackMixState>>,
      required: true,
    },
    bitmaskSequenceInput: {
      type: String,
      default: '',
    },
    /** Full song loop duration in seconds (matches App scheduling). */
    loopDurationSeconds: {
      type: Number,
      default: 1,
    },
    bpm: {
      type: Number,
      default: 90,
    },
  },
  emits: [
    'add-track',
    'select-track',
    'track-name-input',
    'commit-track-name',
    'toggle-muted',
    'toggle-soloed',
    'remove-track',
    'bitmask-sequence-input',
  ],
  data() {
    return {
      activationExpanded: false,
    };
  },
  computed: {
    activationParse() {
      return parseBitmaskSequenceInput(this.bitmaskSequenceInput);
    },
    activationMasks(): bigint[] {
      return this.activationParse.masks;
    },
    activationErrorMessages(): string[] {
      if (this.activationParse.valid) {
        return [];
      }
      return [`Invalid tokens: ${this.activationParse.invalidTokens.join(', ')}`];
    },
    activationStatusLabel(): string {
      const masks = this.activationMasks;
      if (masks.length === 0) {
        return 'off';
      }
      return `${masks.length} chunk${masks.length === 1 ? '' : 's'}`;
    },
    /** Loop duration expressed in beats at the shared BPM (for padding alignment). */
    loopDurationBeats(): number {
      const bpm = Math.max(1, this.bpm);
      const seconds = Math.max(0, this.loopDurationSeconds);
      return Math.max(seconds * bpm / 60, 0.0001);
    },
    trackTimingEntries(): TrackTimingEntry[] {
      const masks = this.activationMasks;
      const loopBeats = this.loopDurationBeats;

      return this.tracks.map((track, trackIndex) => {
        const sequenceLength = this.parseSequence(track.sequenceInput).length;
        const patternBeats = sequenceLength / Math.max(1, track.denominator);
        // Include phase so the strip lines up with App scheduling (delay bars + phase steps).
        const delayBeats = track.delay * track.numerator + track.phase / Math.max(1, track.denominator);
        const activeBeats = patternBeats * track.repeats;
        const totalBeats = delayBeats + activeBeats;
        const totalBars = track.numerator > 0 ? totalBeats / track.numerator : 0;
        return {
          track,
          trackIndex,
          sequenceLength,
          numerator: track.numerator,
          denominator: track.denominator,
          repeats: track.repeats,
          delayBeats,
          patternBeats,
          activeBeats,
          totalBeats,
          totalBars,
          padBeats: Math.max(0, loopBeats - totalBeats),
          repeatBlocks: Array.from({ length: track.repeats }, (_, index) => index + 1),
          chunkStates: buildTrackChunkActivationStates(masks, trackIndex),
        };
      });
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
    getTrackMixState(trackId: string): TrackMixState {
      return this.trackMixStates[trackId] ?? { muted: false, soloed: false };
    },
    isTrackMuted(trackId: string): boolean {
      return this.getTrackMixState(trackId).muted;
    },
    isTrackSoloed(trackId: string): boolean {
      return this.getTrackMixState(trackId).soloed;
    },
    formatBeats(value: number): string {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    },
    formatBars(value: number): string {
      return Number.isInteger(value) ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
    },
    onBitmaskSequenceInput(value: string | number | null) {
      this.$emit('bitmask-sequence-input', value == null ? '' : String(value));
    },
    chunkTooltip(entry: TrackTimingEntry, chunkIndex: number, active: boolean): string {
      const mask = this.activationMasks[chunkIndex];
      const maskText = mask === undefined ? '?' : mask.toString(10);
      const state = active ? 'active' : 'inactive';
      return `Chunk ${chunkIndex + 1}/${entry.chunkStates.length}: B=${maskText} · track bit ${entry.trackIndex} ${state}`;
    },
  },
});
</script>

<style scoped>
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

.track-activation {
  margin-top: 6px;
  border: 1px solid rgba(124, 208, 228, 0.2);
  background: rgba(4, 12, 18, 0.55);
}

.track-activation-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 0;
  background: transparent;
  color: rgba(228, 248, 255, 0.92);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
  text-align: left;
}

.track-activation-toggle:hover,
.track-activation-toggle:focus-visible {
  background: rgba(0, 255, 209, 0.08);
  outline: none;
}

.track-activation-status {
  margin-left: auto;
  color: rgba(176, 226, 237, 0.72);
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  text-transform: lowercase;
}

.track-activation-body {
  padding: 0 8px 8px;
}

.track-activation-help {
  margin: 6px 0 0;
  color: rgba(176, 226, 237, 0.66);
  font-size: 0.72rem;
  line-height: 1.35;
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
  color: rgba(220, 247, 255, 0.74);
  font-size: 0.76rem;
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

.track-timeline-bar {
  position: relative;
  min-width: 0;
  height: 14px;
  border-radius: 0;
  background: rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.track-timeline-segments {
  position: absolute;
  inset: 2px;
  display: flex;
  gap: 3px;
  min-width: 0;
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

.track-activation-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  pointer-events: none;
  z-index: 1;
}

.track-activation-chunk {
  min-width: 0;
  border-right: 1px solid rgba(8, 14, 20, 0.55);
  background: transparent;
}

.track-activation-chunk:last-child {
  border-right: 0;
}

.track-activation-chunk.inactive {
  background: rgba(0, 0, 0, 0.58);
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25);
}

@media (max-width: 680px) {
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
  }

  .track-timeline-segments {
    inset: 1px;
  }

  .track-delete-btn {
    grid-area: delete;
  }

  .track-timeline-controls {
    grid-area: controls;
  }
}
</style>
