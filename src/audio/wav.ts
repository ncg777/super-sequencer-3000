function nextXorshift32(state: number): number {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return state >>> 0;
}

export interface EncodeWavOptions {  /**
   * Invoked with a 0..1 ratio while the PCM data is being interleaved.
   */
  onProgress?: (ratio: number) => void;
  /**
    * Applies TPDF dither at 1 LSB before 24-bit quantization. Enabled by default;
   * dithering decorrelates quantization error from the signal, trading a tiny
   * noise floor increase for the removal of harmonic distortion at low levels.
   */
  dither?: boolean;
}

export async function encodeWavFromChannels(
  channels: Float32Array[],
  sampleRate: number,
  options: EncodeWavOptions = {},
): Promise<Uint8Array> {
  const numChannels = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bitDepth = 24;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataLength = frameCount * blockAlign;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  const bytes = new Uint8Array(wavBuffer);

  let offset = 0;
  const writeString = (value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      bytes[offset] = value.charCodeAt(index);
      offset += 1;
    }
  };

  writeString('RIFF');
  view.setUint32(offset, 36 + dataLength, true);
  offset += 4;
  writeString('WAVE');
  writeString('fmt ');
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numChannels, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * blockAlign, true);
  offset += 4;
  view.setUint16(offset, blockAlign, true);
  offset += 2;
  view.setUint16(offset, bitDepth, true);
  offset += 2;
  writeString('data');
  view.setUint32(offset, dataLength, true);
  offset += 4;

  // WAV PCM has no Int24Array, so pack each signed sample into three little-endian bytes.
  const chunkSize = 65536;
  const dither = options.dither !== false;
  // One LSB of 24-bit audio. TPDF dither is the difference of two independent
  // uniform random values in [0, 1 LSB), giving triangular noise of ±1 LSB.
  const lsb = 1 / 0x800000;
  let ditherStateA = 0x9e3779b9;
  let ditherStateB = 0x243f6a88;
  let writeIndex = 0;

  for (let chunkStart = 0; chunkStart < frameCount; chunkStart += chunkSize) {
    const chunkEnd = Math.min(frameCount, chunkStart + chunkSize);
    for (let frame = chunkStart; frame < chunkEnd; frame += 1) {
      for (let channel = 0; channel < numChannels; channel += 1) {
        const raw = channels[channel][frame];
        if (dither) {
          ditherStateA = nextXorshift32(ditherStateA);
          ditherStateB = nextXorshift32(ditherStateB);
        }
        const dithered = dither
          ? raw + ((ditherStateA - ditherStateB) / 0x100000000) * lsb
          : raw;
        const sample = dithered > 1 ? 1 : dithered < -1 ? -1 : dithered;
        const intSample = Math.round(sample < 0 ? sample * 0x800000 : sample * 0x7fffff);
        const sampleOffset = offset + writeIndex * bytesPerSample;
        bytes[sampleOffset] = intSample & 0xff;
        bytes[sampleOffset + 1] = (intSample >>> 8) & 0xff;
        bytes[sampleOffset + 2] = (intSample >>> 16) & 0xff;
        writeIndex += 1;
      }
    }

    options.onProgress?.(chunkEnd / frameCount);
    if (chunkEnd < frameCount) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }

  options.onProgress?.(1);
  return bytes;
}