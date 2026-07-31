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
import { computed, defineComponent, type PropType } from 'vue';
import type { PresetTrackData } from '../presets';

export interface TrackMixState {
  muted: boolean;
  soloed: boolean;
}

export interface TrackTimingEntry {
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
  },
  emits: [
    'add-track',
    'select-track',
    'track-name-input',
    'commit-track-name',
    'toggle-muted',
    'toggle-soloed',
    'remove-track',
  ],
  computed: {
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
    padding: 1px;
  }

  .track-delete-btn {
    grid-area: delete;
  }

  .track-timeline-controls {
    grid-area: controls;
  }
}
</style>