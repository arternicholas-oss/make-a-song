interface MusicGenerationResponse {
  audioBase64: string
  mimeType: string
}

/**
 * Generate music using Google's Lyria 3 API via direct REST call.
 * No SDK dependency needed — uses native fetch.
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

  const prompt = `Generate a full song in the style of ${genre} with a ${tone} mood. The song is titled "${title}". Here are the lyrics:\n\n${lyrics}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/lyria-3-pro-preview:generateContent?key=${apiKey}`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[LYRIA] API error ${response.status}:`, errorText)
      throw new Error(`Lyria API returned ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    console.log('[LYRIA] Response received, candidates:', data.candidates?.length || 0)

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response candidates returned from Lyria API')
    }

    const candidate = data.candidates[0]
    if (!candidate.content || !candidate.content.parts) {
      throw new Error('No content parts in response')
    }

    // Find the audio part in the response
    let audioBase64 = ''
    let mimeType = 'audio/mpeg'

    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        audioBase64 = part.inlineData.data
        if (part.inlineData.mimeType) {
          mimeType = part.inlineData.mimeType
        }
        break
      }
    }

    if (!audioBase64) {
      throw new Error('No audio data found in Lyria response')
    }

    return { audioBase64, mimeType }
  } catch (error) {
    console.error('Lyria music generation error:', error)
    throw new Error(
      `Failed to generate music with Lyria: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}
