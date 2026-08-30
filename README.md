# GateRunner

A browser-based MIDI step sequencer with tonewheel, four-operator FM, and three-oscillator virtual-analog generators that produces MIDI and WAV files from binary-encoded note sequences using Forte number pitch-class sets.

**Live app:** [https://ncg777.github.io/gaterunner/](https://ncg777.github.io/gaterunner/)

### Presets

GateRunner stores sequences as named presets in the browser.

- The selected preset loads into the working draft.
- Editing controls updates the working draft immediately for playback, MIDI export, and URL sharing.
- Use **Save** to update the selected preset.
- Use **Save As** to create a new preset from the current draft.
- Use **New** to create a fresh default preset.
- Existing single-preset local storage data is migrated automatically the first time the new preset system loads.

### Multidimensional Tonewheel Wavetables

Each melodic track can turn its drawbar registration into a sparse multidimensional
wavetable from the **Generator** tab after selecting **Tonewheel**.

- Enabling the wavetable creates a useful **Brightness** axis with the current sound
  at one end and a bright registration at the other.
- Add independent morph axes without having to fill every corner of a hypercube.
- Move the axis controls to crossfade smoothly between all nearby configurations.
- **Capture configuration here** snapshots the interpolated sound at the current
  position; configurations can then be renamed, moved, and edited.
- The current interpolated registration is also stored in the legacy drawbar field.
  Older presets therefore sound unchanged, and older GateRunner versions can still
  play a representative snapshot of newly saved presets.
- Add up to eight **Vector LFOs** and route each one independently and bipolarly to
  every morph axis, inspired by Prophet VS vector motion and Wavestation wave sequencing.
- LFOs support free rates or dotted/triplet tempo divisions, free/note/bar phase modes,
  bipolar or unipolar output, phase offset, smoothing, and smooth-random motion.
- Note retrigger restarts the track-wide vector trajectory for all sounding voices so
  the shared timbral space stays coherent during polyphonic passages.
- Later LFOs can take an earlier LFO as an FM source, creating acyclic cascades similar
  to modern wavetable modulation matrices while keeping playback deterministic.
- Browser playback updates the spectrum at control rate; browser and CLI WAV exports
  render the same modulation against absolute song time.

### Four-Operator FM Synth

Each melodic track can select **4-Operator FM** from the **Generator** tab.

- Choose from eight routing algorithms: deep serial stacks, parallel stacks, branched
  modulation, and a four-carrier additive layout.
- Operators are numbered from 1 to 4. The algorithm display shows which operators are
  audible carriers and which feed another operator's frequency input.
- Set each operator's frequency ratio from 0.125x to 32x, fine tune by +/-100 cents,
  choose sine/triangle/square/sawtooth, and control its output level.
- Every operator has an independent ADSR envelope. Short modulator envelopes create
  percussive attacks; sustained modulators retain harmonic complexity through a note.
- **Modulation index** controls the shared frequency-deviation depth for algorithm
  routes. **Operator 4 feedback** feeds operator 4 through a one-sample delay for
  increasingly bright or noisy spectra.
- The track's master amp and pitch envelopes, polyphony, mono glide/legato, tremolo,
  vibrato, filters, effects, drive, gain, and reverb send apply to FM as they do to the
  tonewheel generator. Tonewheel oscillator unison is not applied to FM voices.
- Generator selection and all FM settings are stored in presets. Existing presets omit
  the generator field and continue to load as tonewheel patches.
- Browser playback and CLI WAV export both render the selected FM algorithm and operator
  envelopes.

### Three-Oscillator Virtual Analog Synth

Select **Virtual Analog** in a melodic track's **Generator** tab for a wide stereo
subtractive-synthesis source designed for basses, leads, pads, brass, and evolving stacks.

- Three independent oscillators provide sine, triangle, sawtooth, square, and continuously
  variable pulse waves. Each has octave, semitone, fine tune, level, pan, and start phase.
- Every oscillator has its own one-to-four-voice unison stack, detune span, and stereo spread.
  Gain compensation keeps larger stacks from producing a proportional level jump.
- Pulse oscillators expose width, free-running PWM rate, and PWM depth. Each oscillator's
  PWM starts at a different phase so layered pulses do not move in lockstep.
- **Analog drift** gives every oscillator and unison member a separately phased and slightly
  different-rate pitch trajectory. The sub oscillator stays pitch-stable underneath it.
- A dedicated oscillator 1 × oscillator 2 ring-modulation path adds enharmonic and metallic
  spectra without replacing the dry oscillators.
- The sub oscillator has its own waveform, octave, fine tune, level, and pan. A separate
  white, pink, or brown noise source adds air, grit, or low-frequency texture.
- The track's amp and pitch envelopes, polyphony, true mono glide/legato, filter, modulation,
  effects, drive, gain, and reverb send process the complete virtual-analog voice.
- Browser playback uses Web Audio periodic-wave oscillators. CLI WAV export uses deterministic
  polyBLEP discontinuity correction for saw, square, and pulse waves and reproducible colored
  noise, so repeated exports of the same patch are byte-identical.
- All source settings are normalized and stored in presets. Older presets still load as
  tonewheel tracks and receive a non-destructive default virtual-analog patch.

### Import And Export

Preset files use JSON.

- **Export Preset** writes the current preset draft to a single-preset JSON file.
- **Export Library** writes the full preset library to a JSON file.
- **Import JSON** accepts either file type and adds imported presets without overwriting existing ones.
- If an imported preset name already exists, GateRunner keeps both presets by renaming the imported one.

### Track Activation (B)

GateRunner can optionally gate tracks across the full song loop with a song-level bitmask sequence `B`.

- Enter `B` in the collapsible **Track Activation (B)** section above the track strip.
- `B` is a whitespace-separated sequence of nonnegative decimal integer masks, for example `1 2 3 0`.
- Blank input disables the feature; every track stays active for the whole loop.
- When `B` has `N` values, the full longest-track loop duration is split into `N` equal wall-clock chunks.
- Bit 0 controls the first track, bit 1 the second, and so on. Deleting or reordering tracks shifts later bit assignments.
- A mask of `0` is valid and silences every track for that chunk.
- Activation is decided by each note's final post-time-warp onset:
  - Onsets in inactive chunks are omitted.
  - Active notes keep ringing only until the first later chunk where that track becomes inactive.
  - Adjacent active chunks stay continuous.
- Live playback, browser MIDI/WAV export, and CLI MIDI/WAV generation all use the same gating rules.
- The track strip darkens inactive chunks so the schedule stays visible.
- URL sharing accepts `?b=1+2+3+0` (or space-encoded values). The CLI accepts the same syntax via `--b "1 2 3 0"`.

---

### How Notes Are Computed in the Encoding Scheme

This application uses a binary-based encoding system to determine which notes are played from numerical values. Here's how it works:

1. **Binary Representation of Numbers:**

   - Each number is converted into binary, with bit 0 at position 0, bit 1 at position 1, and so on. For example:
     - The number `5` becomes `1010`.
     - The number `10` becomes `0101`.

2. **Pitch Class Assignment:**

   - Each binary digit corresponds to a position in the selected pitch class set going up octavewise to the maximal midi pitch. For example, for 7-35.11:
     - Position 0 = C
     - Position 1 = D
     - Position 2 = E
     - Position 3 = F
     - Position 4 = G
     - Position 5 = A
     - Position 6 = B
     - Position 7 = C
     - ...

3. **Chords:**

   - If multiple `1`s are present, the corresponding notes form a chord.
     - Example: The number `7` (`111`) maps to C, D, and E.

### Summary

To compute notes:

- Convert the number to binary (bit 0 = position 0).
- Map `1`s to their pitch classes.
- Apply an octave offset for final pitches.
- Combine active notes into a chord.
