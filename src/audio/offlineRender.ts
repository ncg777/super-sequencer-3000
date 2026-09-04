import * as Tone from 'tone';

export async function renderOfflineAudio(
  schedule: (context: Tone.OfflineContext) => void | Promise<void>,
  duration: number,
  channels: number,
  sampleRate: number,
): Promise<Tone.ToneAudioBuffer> {
  const originalContext = Tone.getContext();
  const context = new Tone.OfflineContext(channels, duration, sampleRate);
  try {
    let rendering: Promise<Tone.ToneAudioBuffer>;
    Tone.setContext(context);
    try {
      await schedule(context);
      rendering = context.render(false);
    } finally {
      Tone.setContext(originalContext);
    }
    return await rendering;
  } finally {
    context.dispose();
  }
}