<script setup lang="ts">
defineProps<{
  appVersion: string;
}>();

const visible = defineModel<boolean>({ required: true });
</script>

<template>
  <v-dialog v-model="visible" max-width="800px">
    <v-card class="pa-4 bg-black">
      <v-card-title class="pa-4">
        <span class="text-h5 font-weight-bold">
          GateRunner <small class="version">v{{ appVersion }}</small>
        </span>
        <v-spacer />
        <v-btn icon class="close-btn" title="Close help" @click="visible = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider />
      <v-card-text class="pa-4">
        <h4 class="mb-2">How the Sequencer Works</h4>
        <p>The sequencer allows you to customize the following parameters:</p>
        <p>GateRunner stores your work as named presets. Changes affect the current draft immediately for playback and URL sharing, but the preset itself is only updated when you use <strong>Save</strong> or <strong>Save As</strong>. You can also export a single preset or the full preset library to JSON and import them back later.</p>
        <ul>
          <li><strong>Preset</strong>: Pick a named preset, create a new one, save your current draft, or delete presets you no longer need.</li>
          <li><strong>Preset Browser</strong>: Open the preset browser to organize presets into nested folders, search by name/path, and move or delete folders and presets.</li>
          <li><strong>Forte number</strong>: The pitch-class set to use as Forte number with transposition (see <a target="_blank" href="https://en.wikipedia.org/wiki/List_of_set_classes">Forte numbers</a>).</li>
          <li><strong>BPM</strong>: Controls the tempo of the sequence.</li>
          <li><strong>A4</strong>: Master concert pitch in Hz for all tracks (default 440; some prefer 432).</li>
          <li><strong>Numerator/Denominator</strong>: Set per-track rhythmic grid while all tracks share one tempo.</li>
          <li><strong>Tracks</strong>: Each preset can contain multiple tracks with their own MIDI channel, waveform, gain, sequence, octave shift, note length, envelope, unison, modulation, tanh drive, chorus, flanger, phaser, filter, echo, and reverb send.</li>
          <li><strong>Waveform</strong>: Select from classic oscillator waves, choir vowels, colored noise, and other resonant spectra per track.</li>
          <li><strong>Phase Distortion</strong>: Skew/tilt the oscillator phase before waveform lookup. Base Skew of 0.5 is linear; values toward 0 or 1 warp the shape. Optional free-rate or tempo-synced LFO (sine, triangle, saw, square, S&amp;H) modulates skew around the base, with Init Phase setting where the LFO starts in its cycle (0–1).</li>
          <li><strong>Sequence</strong>: Input a sequence of numbers per track to generate notes based on their binary representation.</li>
          <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played for the selected track.</li>
          <li><strong>Track Gain</strong>: Sets each track's audio level in dB. Use the velocity multiplier to control MIDI note velocity independently.</li>
          <li><strong>Note length</strong>: Multiplies the durations of the selected track's notes.</li>
          <li><strong>Track Delay</strong>: Number of bars to wait before the track starts playing.</li>
          <li><strong>Track Repeats</strong>: Number of times the track's pattern is repeated. After its repeats, the track stays silent until the longest track finishes, then everything loops.</li>
          <li><strong>Track Length View</strong>: The track strip shows each track's delay, repeats, and total duration in beats/bars with compact selectable blocks.</li>
          <li><strong>Tanh Drive</strong>: Applies the selected dB gain before a tanh waveshaper, so high values amplify and distort while the final track signal remains softly bounded.</li>
          <li><strong>Instrument/Modulation/Filter</strong>: Shape each track with attack/release, unison voices, tremolo, vibrato, and a key-following multimode filter.</li>
          <li><strong>Effects</strong>: Add optional per-track feedback echo and send each track into the global pink-noise convolution reverb.</li>
          <li><strong>Chorus/Flanger/Phaser</strong>: Tempo-synced modulation effects whose LFO completes one cycle per selected note division (e.g. 4/1 sweeps over four whole notes, 1/8T warbles per eighth triplet), so they follow the BPM automatically.</li>
          <li><strong>Import/Export</strong>: Export one preset or the full library as JSON for backup and sharing, then import those files later without overwriting your existing presets.</li>
          <li><strong>WAV Export</strong>: Render and download an offline WAV mix of all tracks in the current draft, including an automatic rest trail for releases and effects.</li>
        </ul>

        <h3 class="mt-4 mb-2">How Notes Are Computed in the Encoding Scheme</h3>
        <p>This application uses a binary-based encoding system to determine which notes are played from numerical values. Here's how it works:</p>

        <ol>
          <li><strong>Binary Representation of Numbers:</strong>
            <ul>
              <li>Each number's absolute value is converted into binary, with bit 0 at position 0, bit 1 at position 1, and so on. For example:</li>
              <ul>
                <li>The number <code>5</code> becomes <code>101</code>.</li>
                <li>The number <code>10</code> becomes <code>0101</code>.</li>
              </ul>
              <li>Negative numbers are supported and in this case the note indices are computed as you would expect.</li>
            </ul>
          </li>
          <li><strong>Pitch Class Assignment:</strong>
            <ul>
              <li>Each binary digit corresponds to a position in the selected pitch class set, with the octave shift, going up and down octavewise to the minimal and maximal MIDI pitch. For example, to give a general idea without considering the octave, for 3-11B.00 you would get:
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
      <v-divider />
      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="primary" @click="visible = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.version {
  margin-left: 1em;
  color: #888888;
  font-size: 0.6em;
}

.close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
}
</style>