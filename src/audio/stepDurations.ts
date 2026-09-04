export function getStepDurations(notes: readonly (readonly number[])[]): number[] {
  const durations = new Array<number>(notes.length).fill(1);
  const firstNote = notes.findIndex((step) => step.length > 0);
  if (firstNote < 0) {
    return durations;
  }
  let nextNote = firstNote + notes.length;
  for (let index = notes.length - 1; index >= 0; index -= 1) {
    const distance = nextNote - index;
    if (distance < notes.length) {
      durations[index] = distance;
    }
    if (notes[index].length > 0) {
      nextNote = index;
    }
  }
  return durations;
}