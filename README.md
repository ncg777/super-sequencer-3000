# GateRunner

A browser-based MIDI step sequencer and tonewheel synthesizer with phase distortion and effects that generates MIDI and WAV files from binary-encoded note sequences using Forte number pitch-class sets.

**Live app:** [https://ncg777.github.io/gaterunner/](https://ncg777.github.io/gaterunner/)

### Presets

GateRunner stores sequences as named presets in the browser.

- The selected preset loads into the working draft.
- Editing controls updates the working draft immediately for playback, MIDI export, and URL sharing.
- Use **Save** to update the selected preset.
- Use **Save As** to create a new preset from the current draft.
- Use **New** to create a fresh default preset.
- Existing single-preset local storage data is migrated automatically the first time the new preset system loads.

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

