import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { buildPrompt, parseSong, generatePreviewId } from '@/lib/prompts'
import { generateMusic } from '@/lib/lyria'
import { clipAudio } from '@/lib/audio'
import { checkRate, getClientIp } from '@/lib/rate-limit'
import { serverCapture, EVT, flushServer } from '@/lib/posthog'
import type { Answers } from '@/lib/types'

export const runtime = 'nodejs'      // ffmpeg needs Node runtime
export const maxDuration = 300       // give Lyria + ffmpeg breathing room

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

// Rate limits — tuned for "legitimate shopper does 1-2 previews" while
// blocking "scrape the whole service for free Lyria audio".
const RATE_LIMIT_PER_HOUR = 5
const RATE_LIMIT_WINDOW_S = 3600
const MAX_REGENS_TOTAL = 4     // 1 initial + 3 regenerations

const MAX_STRING_LEN = 2000
const MAX_ANSWERS_KEYS = 40

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

function isSafeString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_STRING_LEN
}

function validateAnswers(answers: unknown): { ok: true; value: Answers } | { ok: false; error: string } {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'answers must be an object' }
  }
  const obj = answers as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return { ok: false, error: 'answers is empty' }
  if (keys.length > MAX_ANSWERS_KEYS) return { ok: false, error: 'too many answer fields' }
  if (!isSafeString(obj.occasion)) return { ok: false, error: 'invalid occasion' }
  if (!isSafeString(obj.genre)) return { ok: false, error: 'invalid genre' }
  for (const k of keys) {
    const val = obj[k]
    if (val === null || val === undefined || val === '') continue
    if (typeof val !== 'string') return { ok: false, error: `field ${k} must be a string` }
    if (val.length > MAX_STRING_LEN) return { ok: false, error: `field ${k} exceeds max length` }
  }
  return { ok: true, value: obj as unknown as Answers }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now()
  // Hoisted so the outer catch can include sessionId in the error telemetry
  // even when failure happens before validation completes.
  let capturedSessionId = 'unknown'
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { sessionId, email, answers } = body as {
      sessionId?: unknown
      email?: unknown
      answers?: unknown
    }
    if (typeof sessionId === 'string') capturedSessionId = sessionId

    if (!isSafeString(sessionId) || (sessionId as string).length > 100) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'A valid email is required to generate a preview' }, { status: 400 })
    }
    const answersCheck = validateAnswers(answers)
    if (answersCheck.ok !== true) {
      return NextResponse.json({ error: answersCheck.error }, { status: 400 })
    }
    const validAnswers = answersCheck.value
    const isBrand = validAnswers.occasion === 'brand'
    const ip = getClientIp(req)

    // ─── Rate limit ───────────────────────────────────────────────────────────
    const rate = await checkRate(ip, 'preview_create', RATE_LIMIT_PER_HOUR, RATE_LIMIT_WINDOW_S)
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many previews from your network. Please try again in an hour.' },
        { status: 429 }
      )
    }

    // ─── Generate lyrics ──────────────────────────────────────────────────────
    const prompt = buildPrompt(validAnswers)

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })
    const rawText = msg.content.map(b => (b.type === 'text' ? b.text : '')).join('\n')
    const parsed = parseSong(rawText)

    if (!parsed.title || parsed.sections.length < 3) {
      const retry = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      })
      const retryText = retry.content.map(b => (b.type === 'text' ? b.text : '')).join('\n')
      Object.assign(parsed, parseSong(retryText))
    }

    if (!parsed.title || parsed.sections.length < 3) {
      return NextResponse.json({ error: 'Lyric generation failed' }, { status: 502 })
    }

    const previewId = generatePreviewId()
    const recipientName = isBrand
      ? (validAnswers as any).brand_name
      : (validAnswers as any).recipient_name
    const tone = isBrand ? (validAnswers as any).brand_tone : (validAnswers as any).tone

    // Voice is an optional field on both Personal + Brand answers. Defaults to
    // 'either' so older clients that don't send it still get audio.
    const voiceRaw = (validAnswers as any).voice
    const voice: 'male' | 'female' | 'either' =
      voiceRaw === 'male' || voiceRaw === 'female' ? voiceRaw : 'either'

    // ─── Generate music (Lyria) ───────────────────────────────────────────────
    let audioPathPreview: string | undefined
    let audioUrlPreview: string | undefined
    let audioPathFull: string | undefined

    try {
      const lyricsText = parsed.sections
        .map(s => `[${s.label}]\n${s.lines.join('\n')}`)
        .join('\n\n')

      const music = await generateMusic(lyricsText, validAnswers.genre, tone, parsed.title, voice)
      const fullBuffer = Buffer.from(music.audioBase64, 'base64')

      // Clip to 20s MP3 for the preview.
      const clip = await clipAudio(fullBuffer, music.mimeType, 20)

      // Upload full (private) and preview (public) to Supabase storage.
      const fullPath = `${previewId}.mp3`
      const previewPath = `${previewId}.mp3`

      const [fullUp, previewUp] = await Promise.all([
        supabaseAdmin.storage
          .from('songs-audio-private')
          .upload(fullPath, fullBuffer, {
            contentType: music.mimeType,
            upsert: true,
          }),
        supabaseAdmin.storage
          .from('previews-audio')
          .upload(previewPath, clip.buffer, {
            contentType: clip.mimeType,
            upsert: true,
          }),
      ])

      if (!fullUp.error) audioPathFull = fullPath
      if (!previewUp.error) {
        audioPathPreview = previewPath
        const { data } = supabaseAdmin.storage.from('previews-audio').getPublicUrl(previewPath)
        audioUrlPreview = data?.publicUrl
      }
      if (previewUp.error) console.error('[preview] clip upload failed:', previewUp.error)
      if (fullUp.error) console.error('[preview] full upload failed:', fullUp.error)
    } catch (musicErr) {
      console.error('[preview] music generation error:', musicErr)
      // Audio is a nice-to-have for the preview. Lyrics should still go out,
      // but without audio. Client will show a copy explaining.
      //
      // Capture the actual error to PostHog so we can debug — Vercel runtime
      // logs truncate after ~30 chars, which makes diagnosing Lyria/Gemini
      // failures impossible from log tooling alone.
      try {
        const lyriaMessage = musicErr instanceof Error ? musicErr.message : String(musicErr)
        const lyriaStack = musicErr instanceof Error ? musicErr.stack : undefined
        serverCapture(sessionId as string, EVT.PREVIEW_GENERATION_FAILED, {
          stage: 'lyria',
          error: lyriaMessage,
          stack: lyriaStack,
          gemini_key_set: !!process.env.GEMINI_API_KEY,
          genre: validAnswers.genre,
          occasion: validAnswers.occasion,
          elapsed_ms: Date.now() - startedAt,
          // We do NOT bail out — preview still ships with lyrics only.
          fatal: false,
        })
      } catch {
        // telemetry must not mask the real flow
      }
    }

    // ─── Persist preview row ──────────────────────────────────────────────────
    const { error: insertError } = await supabaseAdmin
      .from('previews')
      .insert({
        preview_id: previewId,
        session_id: sessionId,
        email,
        ip,
        occasion: validAnswers.occasion,
        genre: validAnswers.genre,
        tone: isBrand ? null : (validAnswers as any).tone,
        brand_tone: isBrand ? (validAnswers as any).brand_tone : null,
        is_brand: isBrand,
        answers: validAnswers,
        title: parsed.title,
        sections: parsed.sections,
        audio_url_preview: audioUrlPreview || null,
        audio_path_preview: audioPathPreview || null,
        audio_path_full: audioPathFull || null,
        regen_count: 1,   // initial generation counts as attempt 1
        max_regens: MAX_REGENS_TOTAL,
      })

    if (insertError) {
      console.error('[preview] insert failed:', insertError)
      return NextResponse.json({ error: 'Failed to save preview' }, { status: 500 })
    }

    // Audit insert is best-effort. Never fail the user's request because the
    // audit log is unavailable — historically a failure here crashed the
    // entire generate handler post-Lyria, eating the API spend with no
    // preview shown to the user.
    try {
      const { error: auditErr } = await supabaseAdmin.from('preview_audit').insert({
        preview_id: previewId,
        session_id: sessionId,
        email,
        ip,
        event: 'create',
        attempt_no: 1,
        lyria_ok: !!audioUrlPreview,
        elapsed_ms: Date.now() - startedAt,
      })
      if (auditErr) console.error('[preview] audit insert failed (non-fatal):', auditErr)
    } catch (auditEx) {
      console.error('[preview] audit insert threw (non-fatal):', auditEx)
    }

    serverCapture(sessionId as string, EVT.PREVIEW_GENERATED, {
      preview_id: previewId,
      genre: validAnswers.genre,
      occasion: validAnswers.occasion,
      is_brand: isBrand,
      has_audio: !!audioUrlPreview,
      elapsed_ms: Date.now() - startedAt,
    })

    await flushServer()

    return NextResponse.json({
      success: true,
      preview: {
        preview_id: previewId,
        title: parsed.title,
        sections: parsed.sections,
        recipient_name: recipientName,
        genre: validAnswers.genre,
        tone,
        occasion: validAnswers.occasion,
        is_brand: isBrand,
        audio_url_preview: audioUrlPreview,
        regen_count: 1,
        max_regens: MAX_REGENS_TOTAL,
        regens_remaining: MAX_REGENS_TOTAL - 1,
      },
    })
  } catch (err) {
    // Surface the real error in logs (Vercel function logs) AND emit a
    // PostHog server event so we can debug failures without tail access.
    // The client-facing message stays generic to avoid leaking internals.
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[preview/generate] error:', message, stack)
    try {
      serverCapture(capturedSessionId, EVT.PREVIEW_GENERATION_FAILED, {
        error: message,
        elapsed_ms: Date.now() - startedAt,
      })
      await flushServer()
    } catch {
      // swallow — telemetry must not mask the real error
    }
    return NextResponse.json({ error: 'Preview generation failed' }, { status: 500 })
  }
}
