const isLittleEndian = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

export interface EncodeWavOptions {  /**
   * Invoked with a 0..1 ratio while the PCM data is being interleaved.
   */
  onProgress?: (ratio: number) => void;
}

export function encodeWavFromChannels(
  channels: Float32Array[],
  sampleRate: number,
  options: EncodeWavOptions = {},
): Uint8Array {
  const numChannels = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bitDepth = 16;
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

  // Interleave straight into an Int16Array view over the data chunk. This avoids
  // the per-sample DataView call overhead of the previous implementation, which
  // dominated export time for long mixes.
  const samples = new Int16Array(wavBuffer, offset, frameCount * numChannels);
  const reportEvery = Math.max(1, Math.floor(frameCount / 20));
  let writeIndex = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const raw = channels[channel][frame];
      const sample = raw > 1 ? 1 : raw < -1 ? -1 : raw;
      const intSample = Math.round(sample < 0 ? sample * 0x8000 : sample * 0x7fff);
      if (isLittleEndian) {
        samples[writeIndex] = intSample;
      } else {
        view.setInt16(offset + writeIndex * 2, intSample, true);
      }
      writeIndex += 1;
    }

    if (options.onProgress && frame % reportEvery === 0) {
      options.onProgress(frame / frameCount);
    }
  }

  options.onProgress?.(1);
  return bytes;
}