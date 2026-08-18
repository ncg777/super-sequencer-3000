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
          <li><strong>Track Activation (B)</strong>: Optional collapsible song-level sequence of nonnegative decimal bitmasks. Blank disables gating. When set, its <code>N</code> values split the full longest-track loop into <code>N</code> equal wall-clock chunks. Bit 0 controls the first track, bit 1 the second, and so on (deleting a track shifts later bits). A mask of <code>0</code> silences every track for that chunk. Activation uses each note's final post-time-warp onset; inactive onsets are omitted, and active notes are clipped at the first later inactive chunk boundary. Example: <code>1 2 3 0</code>. The track strip darkens inactive chunks.</li>
          <li><strong>Rhythmic tracks</strong>: Add a rhythmic track to use a synthesized GM-oriented drum kit instead of the melodic pitch-class encoder. Its ordered lanes map to GM percussion notes, with lane 1 using the least-significant velocity bits. Each sequence value is a decimal BigInt mask; the selected 1-7 velocity bits per lane allow simultaneous hits and velocity variation. Assign an XOR group (1-8) to choke other members of that group so only one can be active; the default is no group. When two grouped voices fire on the same step, the later/higher lane wins. Rhythmic tracks default to MIDI channel 10, but the channel remains editable for hardware routing.</li>
          <li><strong>Numerator/Denominator</strong>: Set per-track rhythmic grid while all tracks share one tempo.</li>
          <li><strong>Tracks</strong>: Each preset can contain multiple tracks with their own MIDI channel, waveform, gain, sequence, octave shift, note length, amp/pitch envelopes, unison, modulation, tanh drive, chorus, flanger, phaser, filter, echo, and reverb send.</li>
          <li><strong>Waveform</strong>: Select from classic oscillator waves, choir vowels, colored noise, and other resonant spectra per track.</li>
          <li><strong>Sequence</strong>: Input a sequence of numbers per track to generate notes based on their binary representation.</li>
          <li><strong>Octave Shift</strong>: Adjusts the octave of the notes played for the selected track.</li>
          <li><strong>Track Gain</strong>: Sets each track's audio level in dB. Use the velocity multiplier to control MIDI note velocity independently.</li>
          <li><strong>Note length</strong>: Multiplies the durations of the selected track's notes, then adds the optional fixed length measured in that track's steps (for example, a denominator of 4 makes one step a sixteenth note).</li>
          <li><strong>Track Delay</strong>: Number of bars to wait before the track starts playing.</li>
          <li><strong>Track Repeats</strong>: Number of times the track's pattern is repeated. After its repeats, the track stays silent until the longest track finishes, then everything loops.</li>
          <li><strong>Track Length View</strong>: The track strip shows each track's delay, repeats, and total duration in beats/bars with compact selectable blocks.</li>
          <li><strong>Tanh Drive</strong>: Applies the selected dB gain before a tanh waveshaper, so high values amplify and distort while the final track signal remains softly bounded.</li>
          <li><strong>Envelopes</strong>: Each track has a separate amp ADSR and pitch ADSR. Pitch Env Amount is in MIDI pitches (can be negative). Pitch Env Shape is a numeric exponential steepness (0 = linear; higher values make the curve steeper).</li>
          <li><strong>Instrument/Modulation/Filter</strong>: Shape each track with amp/pitch envelopes, unison voices, tremolo, vibrato, and a key-following multimode filter.</li>
          <li><strong>Effects</strong>: Add optional per-track feedback echo and send each track into the global pink-noise convolution reverb.</li>
          <li><strong>Chorus/Flanger/Phaser</strong>: Tempo-synced modulation effects whose LFO completes one cycle per selected note division (e.g. 4/1 sweeps over four whole notes, 1/8T warbles per eighth triplet), so they follow the BPM automatically.</li>
          <li><strong>Phaser</strong>: A classic phaser pedal: a cascade of first-order allpass stages (each stage pair creates one notch) whose poles are spaced one octave apart around the Center frequency and swept by the LFO over ±(Sweep % of 5 octaves). Stages picks the pole count (classic pedals use 4), Feedback resonates the notches, Resonance sharpens each pole, and Wet sets the dry/phase-shifted mix (always at least 50% wet so the notches stay audible).</li>
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