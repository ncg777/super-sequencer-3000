[https://ncg777.github.io/super-sequencer-3000/](https://ncg777.github.io/super-sequencer-3000/)

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

