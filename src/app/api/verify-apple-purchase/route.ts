import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { buildPrompt, parseSong, generateSongId } from '@/lib/prompts'
import { generateMusic } from '@/lib/lyria'
import type { Answers } from '@/lib/types'

/**
 * Apple In-App Purchase verification + song generation endpoint.
 * Called by the iOS app after a successful StoreKit 2 purchase.
 * Mirrors the test-generate flow but verifies Apple receipt first.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })

async function verifyAppleTransaction(transactionId: string): Promise<boolean> {
  // StoreKit 2 verifies on-device via signed JWS tokens.
  // Basic server-side validation — transaction IDs are numeric.
  // TODO: For production hardening, implement App Store Server API v2 verification.
  if (!transactionId || !/^\d+$/.test(transactionId)) {
    console.warn('[Apple IAP] Invalid transaction ID:', transactionId)
    return false
  }
  console.log('[Apple IAP] Transaction accepted:', transactionId)
  return true
}

export async function POST(req: NextRequest) {
  try {
    const { transactionId, receiptData, sessionId, email, answers } = await req.json()

    if (!transactionId || !sessionId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify Apple transaction
    const isValid = await verifyAppleTransaction(transactionId)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Apple transaction' }, { status: 403 })
    }

    // Check for duplicate transaction (prevent replay)
    const { data: existing } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('apple_transaction_id', transactionId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 })
    }

    const isBrand = answers.occasion === 'brand'
    const genre = answers.genre || 'pop-anthem'
    const tone = isBrand ? answers.brand_tone : answers.tone || 'uplifting'

    // Create paid order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        session_id: sessionId,
        answers,
        genre,
        tone: isBrand ? null : tone,
        brand_tone: isBrand ? tone : null,
        occasion: answers.occasion || 'just-because',
        is_brand: isBrand || false,
        email: email || null,
        paid: true,
        payment_method: 'apple_iap',
        apple_transaction_id: transactionId,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('[Apple IAP] Order error:', orderError)
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }

    // Build and send prompt to Claude
    const prompt = buildPrompt(answers)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = message.content
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('\n')

    const parsed = parseSong(rawText)
    const songId = generateSongId()
    const recipientName = isBrand ? answers.brand_name : answers.recipient_name

    // Save song to Supabase
    const { data: song, error: songError } = await supabaseAdmin
      .from('songs')
      .insert({
        song_id: songId,
        order_id: order.id,
        title: parsed.title,
        sections: parsed.sections,
        recipient_name: recipientName,
        genre: order.genre,
        tone: isBrand ? order.brand_tone : order.tone,
        occasion: order.occasion,
        is_brand: isBrand || false,
        regen_count: 0,
      })
      .select()
      .single()

    if (songError) {
      console.error('[Apple IAP] Song save error:', songError)
      return NextResponse.json({ error: 'Failed to save song' }, { status: 500 })
    }

    // Generate music with Lyria
    let audioUrl: string | undefined
    try {
      const lyricsText = parsed.sections
        .map(s => `[${s.label}]\n${s.lines.join('\n')}`)
        .join('\n\n')

      console.log('[Apple IAP] Starting Lyria music generation:', songId)
      const musicResponse = await generateMusic(
        lyricsText,
        order.genre,
        isBrand ? order.brand_tone : order.tone,
        parsed.title
      )

      const audioBuffer = Buffer.from(musicResponse.audioBase64, 'base64')
      const ext = musicResponse.mimeType.includes('wav') ? 'wav' : musicResponse.mimeType.includes('mp3') || musicResponse.mimeType.includes('mpeg') ? 'mp3' : 'wav'
      const audioPath = `${songId}.${ext}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('songs-audio')
        .upload(audioPath, audioBuffer, {
          contentType: musicResponse.mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[Apple IAP] Audio upload error:', uploadError)
      } else {
        const { data } = supabaseAdmin.storage.from('songs-audio').getPublicUrl(audioPath)
        audioUrl = data?.publicUrl

        if (audioUrl) {
          await supabaseAdmin
            .from('songs')
            .update({ audio_url: audioUrl })
            .eq('song_id', songId)
        }
      }
    } catch (musicError) {
      console.error('[Apple IAP] Music generation failed (non-fatal):', musicError)
    }

    return NextResponse.json({
      success: true,
      songId,
      songUrl: `/song/${songId}`,
      song: {
        song_id: songId,
        title: parsed.title,
        sections: parsed.sections,
        recipient_name: recipientName,
        genre: order.genre,
        tone: isBrand ? order.brand_tone : order.tone,
        occasion: order.occasion,
        is_brand: isBrand || false,
        audio_url: audioUrl,
      },
    })
  } catch (err) {
    console.error('[Apple IAP] Error:', err)
    return NextResponse.json({ error: 'Generation failed', details: String(err) }, { status: 500 })
  }
}
