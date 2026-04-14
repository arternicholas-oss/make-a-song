/**
 * Audio clipping helper — server-side only.
 *
 * Used to cut a ~20s preview from the Lyria-generated full song so we can
 * surface a non-bypassable preview to pre-purchase visitors. The full audio
 * stays in a private bucket and is only exposed via signed URL after the
 * Stripe payment webhook lands.
 *
 * Depends on:
 *   - ffmpeg-static (binary path)
 *   - fluent-ffmpeg (wrapper)
 *   - Node 18+ built-in fs/promises
 *
 * IMPORTANT: this module uses Node APIs (fs, tmpdir, child_process). Only
 * import it from API routes that run on the Node runtime, not edge.
 */

import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'

// ffmpeg-static ships a platform-specific binary. On Vercel's Node runtime
// (Linux x64), it resolves to a bundled ffmpeg executable.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpegPath: string | null = require('ffmpeg-static')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ffmpeg = require('fluent-ffmpeg')

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath)
}

export interface ClipResult {
  buffer: Buffer
  mimeType: string
  durationSeconds: number
}

/**
 * Cut the first `seconds` of an audio buffer to MP3.
 *
 * We write the source to a temp file (fluent-ffmpeg prefers file inputs) and
 * read the clipped output back into a Buffer. Both temp files are cleaned up
 * in a finally block even on error.
 *
 * Returns an MP3 buffer at a modest bitrate (128kbps) — small enough to load
 * instantly, good enough to hear pronunciation problems.
 */
export async function clipAudio(
  sourceBuffer: Buffer,
  sourceMime: string,
  seconds: number = 20
): Promise<ClipResult> {
  if (!ffmpegPath) {
    throw new Error('ffmpeg-static did not resolve a binary path — check deployment bundling')
  }

  const nonce = randomBytes(6).toString('hex')
  const sourceExt = mimeToExt(sourceMime)
  const srcPath = join(tmpdir(), `masay-src-${nonce}.${sourceExt}`)
  const outPath = join(tmpdir(), `masay-out-${nonce}.mp3`)

  try {
    await fs.writeFile(srcPath, sourceBuffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(srcPath)
        .setStartTime(0)
        .duration(seconds)
        // Re-encode to MP3 so the output size/format is predictable. We
        // cannot stream-copy because Lyria sometimes hands us WAV/FLAC.
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(2)
        .audioFrequency(44100)
        .format('mp3')
        .on('error', (err: Error) => reject(err))
        .on('end', () => resolve())
        .save(outPath)
    })

    const buffer = await fs.readFile(outPath)
    return {
      buffer,
      mimeType: 'audio/mpeg',
      durationSeconds: seconds,
    }
  } finally {
    // Best-effort cleanup; ignore errors.
    await Promise.allSettled([fs.unlink(srcPath), fs.unlink(outPath)])
  }
}

function mimeToExt(mime: string): string {
  const m = mime.toLowerCase()
  if (m.includes('wav')) return 'wav'
  if (m.includes('flac')) return 'flac'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('aac') || m.includes('m4a') || m.includes('mp4')) return 'm4a'
  return 'mp3'
}
