interface MusicGenerationResponse {
  audioBase64: string
  mimeType: string
  /** Which prompt path produced the audio. Surfaced to PostHog for monitoring. */
  promptStrategy?: 'with_lyrics' | 'instrumental_fallback'
}

const LYRIA_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro-preview:generateContent'

// Toggleable safety categories — relax to BLOCK_ONLY_HIGH so user-generated
// lyrics with strong language don't get nuked. The non-toggleable
// PROHIBITED_CONTENT filter (CSAM/weapons/etc.) cannot be lowered — we handle
// that one with the instrumental-fallback retry below.
const RELAXED_SAFETY = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
]

interface LyriaCallResult {
  ok: boolean
  audioBase64?: string
  mimeType?: string
  blockReason?: string
  errorMessage?: string
  rawHead?: string
}

async function callLyria(apiKey: string, prompt: string): Promise<LyriaCallResult> {
  const response = await fetch(LYRIA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['AUDIO', 'TEXT'] },
      safetySettings: RELAXED_SAFETY,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      ok: false,
      errorMessage: `Lyria API returned ${response.status}: ${errorText.slice(0, 400)}`,
    }
  }

  const data = await response.json()
  const rawHead = JSON.stringify(data).slice(0, 600)

  if (!data.candidates || data.candidates.length === 0) {
    const blockReason: string | undefined = data.promptFeedback?.blockReason
    return {
      ok: false,
      blockReason,
      errorMessage: `No candidates. promptFeedback=${JSON.stringify(data.promptFeedback || {})}`,
      rawHead,
    }
  }

  const cand0 = data.candidates[0]
  if (
    cand0?.finishReason &&
    cand0.finishReason !== 'STOP' &&
    (!cand0.content?.parts || cand0.content.parts.length === 0)
  ) {
    return {
      ok: false,
      blockReason: cand0.finishReason,
      errorMessage: `Candidate empty. finishReason=${cand0.finishReason} safetyRatings=${JSON.stringify(cand0.safetyRatings || [])}`,
      rawHead,
    }
  }

  let audioBase64 = ''
  let mimeType = 'audio/mpeg'
  for (const part of cand0.content?.parts || []) {
    if (part.inlineData) {
      audioBase64 = part.inlineData.data
      if (part.inlineData.mimeType) mimeType = part.inlineData.mimeType
      break
    }
  }
  if (!audioBase64) {
    return { ok: false, errorMessage: 'No audio data in response', rawHead }
  }
  return { ok: true, audioBase64, mimeType }
}

/**
 * Generate music using Google's Lyria 3 Pro Preview API.
 *
 * Strategy:
 *   1. First attempt: full prompt with lyrics, relaxed safetySettings.
 *   2. If first attempt is blocked (PROHIBITED_CONTENT or any block reason),
 *      fall back to an instrumental-only prompt that omits the lyric text and
 *      describes the music structurally. Saves the audio outcome at the cost
 *      of having no vocals — but a 20s instrumental clip is much better UX
 *      than no audio at all, since the preview is an audio teaser anyway.
 */
export async function generateMusic(
  lyrics: string,
  genre: string,
  tone: string,
  title: string
): Promise<MusicGenerationResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set')
  }

  const fullPrompt = `Generate a full song in the style of ${genre} with a ${tone} mood. The song is titled "${title}". Here are the lyrics:\n\n${lyrics}`

  const first = await callLyria(apiKey, fullPrompt)
  if (first.ok && first.audioBase64) {
    return {
      audioBase64: first.audioBase64,
      mimeType: first.mimeType || 'audio/mpeg',
      promptStrategy: 'with_lyrics',
    }
  }

  // Fall back to instrumental prompt when the lyric-bearing prompt was blocked
  // or otherwise failed. We retry on ANY failure (not just blocks) because the
  // instrumental version is always safer and the cost of a second call is
  // bounded — Lyria responds quickly when blocked.
  console.warn(
    `[LYRIA] First attempt failed (${first.blockReason || 'no_block_reason'}): ${first.errorMessage}. Retrying with instrumental fallback.`
  )

  const instrumentalPrompt =
    `Compose an instrumental ${genre} backing track with a ${tone} mood. ` +
    `Length: about one minute. Standard song structure: intro, verse, chorus, verse, chorus, outro. ` +
    `Clean instrumentation, no vocals, no spoken word.`

  const second = await callLyria(apiKey, instrumentalPrompt)
  if (second.ok && second.audioBase64) {
    return {
      audioBase64: second.audioBase64,
      mimeType: second.mimeType || 'audio/mpeg',
      promptStrategy: 'instrumental_fallback',
    }
  }

  // Both failed — surface enough context for PostHog to debug.
  throw new Error(
    `Failed to generate music with Lyria after fallback. ` +
      `first=${first.blockReason || 'err'}:${first.errorMessage} | ` +
      `second=${second.blockReason || 'err'}:${second.errorMessage} | ` +
      `firstRaw=${first.rawHead || ''} secondRaw=${second.rawHead || ''}`
  )
}
