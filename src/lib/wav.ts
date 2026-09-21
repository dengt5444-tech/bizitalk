// Minimal WAV (PCM) helpers used to stitch several OpenAI TTS clips (one
// per dialogue line) into a single seamless audio file.
//
// The old approach asked for mp3 output per line and joined the raw bytes
// with Buffer.concat. Each mp3 clip is its own independently-encoded
// stream with its own encoder priming/padding silence and header frames —
// concatenating them at the byte level produces an audio file with small
// gaps, clicks, and occasionally a garbled moment at every seam, which is
// exactly what showed up as "hard to hear" and "lagging" dialogue audio,
// since almost every listening material alternates between two speakers
// (and so is built from several separate clips).
//
// WAV/PCM doesn't have that problem: it's just a fixed header followed by
// raw, uncompressed samples, so extracting the sample data from each clip
// and concatenating that (with an explicit, deliberate silence gap between
// lines for natural pacing) produces one genuinely gapless file.

export type PcmClip = {
  pcm: Buffer;
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
};

// OpenAI's wav response is a standard RIFF/WAVE file: a "fmt " chunk
// describing the sample format, followed by a "data" chunk. Its declared
// data-chunk size is sometimes a placeholder (streaming responses don't
// know the final length upfront), so the real data is taken as running to
// the end of the buffer rather than trusted from that field.
export function parseWavPcm(buffer: Buffer): PcmClip {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("not a RIFF/WAVE buffer");
  }

  let offset = 12;
  let format: { sampleRate: number; channels: number; bitsPerSample: number } | null = null;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const declaredSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;

    if (chunkId === "fmt ") {
      format = {
        channels: buffer.readUInt16LE(chunkDataStart + 2),
        sampleRate: buffer.readUInt32LE(chunkDataStart + 4),
        bitsPerSample: buffer.readUInt16LE(chunkDataStart + 14),
      };
      offset = chunkDataStart + declaredSize + (declaredSize % 2);
      continue;
    }

    if (chunkId === "data") {
      if (!format) throw new Error("wav data chunk found before fmt chunk");
      const remaining = buffer.length - chunkDataStart;
      const dataLength = declaredSize > 0 && declaredSize <= remaining ? declaredSize : remaining;
      return {
        pcm: buffer.subarray(chunkDataStart, chunkDataStart + dataLength),
        sampleRate: format.sampleRate,
        channels: format.channels,
        bitsPerSample: format.bitsPerSample,
      };
    }

    offset = chunkDataStart + declaredSize + (declaredSize % 2);
  }

  throw new Error("wav data chunk not found");
}

function silenceBuffer(format: Omit<PcmClip, "pcm">, ms: number): Buffer {
  const bytesPerSample = format.bitsPerSample / 8;
  const frameBytes = bytesPerSample * format.channels;
  const frames = Math.round((format.sampleRate * ms) / 1000);
  // 16-bit PCM silence is just zero bytes at every sample.
  return Buffer.alloc(frames * frameBytes);
}

function wavHeader(format: Omit<PcmClip, "pcm">, dataLength: number): Buffer {
  const header = Buffer.alloc(44);
  const byteRate =
    format.sampleRate * format.channels * (format.bitsPerSample / 8);
  const blockAlign = format.channels * (format.bitsPerSample / 8);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataLength, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // fmt chunk size (PCM)
  header.writeUInt16LE(1, 20); // audio format: PCM
  header.writeUInt16LE(format.channels, 22);
  header.writeUInt32LE(format.sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(format.bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataLength, 40);

  return header;
}

// Joins several PCM clips (assumed to share the same sample format — true
// for clips from the same TTS model/response_format) into one WAV buffer,
// inserting `gapMs` of silence between each clip for natural pacing.
export function joinPcmClipsToWav(clips: PcmClip[], gapMs: number): Buffer {
  if (clips.length === 0) throw new Error("no clips to join");

  const format = clips[0];
  const gap = silenceBuffer(format, gapMs);
  const parts: Buffer[] = [];
  clips.forEach((clip, i) => {
    if (i > 0) parts.push(gap);
    parts.push(clip.pcm);
  });

  const data = Buffer.concat(parts);
  return Buffer.concat([wavHeader(format, data.length), data]);
}
