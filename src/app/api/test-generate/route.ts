import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'
import { buildPrompt, parseSong, generateSongId } from '@/lib/prompts'
import { generateMusic } from '@/lib/lyria'
import type { Answers } from '@/lib/types'

/**
 * TEST ENDPOINT — skips Stripe payment for local testing.
 * Remove or protect this route before deploying to production.
 */

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { answers, genre, tone, occasion, isBrand, email, brandTone } = await req.json()

    if (!answers) {
      return NextResponse.json({ error: 'Missing answers' }, { status: 400 })
    }

    // Create a fake order so the rest of the pipeline works
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        session_id: 'test-' + Date.now(),
        answers,
        genre: genre || 'pop-anthem',
        tone: tone || 'uplifting',
        occasion: occasion || 'just-because',
        is_brand: isBrand || false,
        brand_tone: brandTone || null,
        email: email || 'test@test.com',
        paid: true,
        stripe_session_id: 'test_skip_' + Date.now(),
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Failed to create test order:', orderError)
      return NextResponse.json({ error: 'Failed to create test order' }, { status: 500 })
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
    const recipientName = isBrand
      ? (answers as any).brand_name
      : (answers as any).recipient_name

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
      console.error('Failed to save song:', songError)
      return NextResponse.json({ error: 'Failed to save song' }, { status: 500 })
    }

    let audioUrl: string | undefined

    // Generate music with Lyria
    try {
      const lyricsText = parsed.sections
        .map(s => `[${s.label}]\n${s.lines.join('\n')}`)
        .join('\n\n')

      console.log('Starting Lyria music generation for test song:', songId)
      const musicResponse = await generateMusic(
        lyricsText,
        order.genre,
        isBrand ? order.brand_tone : order.tone,
        parsed.title
      )

      const audioBuffer = Buffer.from(musicResponse.audioBase64, 'base64')
      const audioPath = `${songId}.mp3`
      const { error: uploadError } = await supabaseAdmin.storage
        .from('songs-audio')
        .upload(audioPath, audioBuffer, {
          contentType: musicResponse.mimeType,
          upsert: true,
        })

      if (uploadError) {
        console.error('Audio upload error:', uploadError)
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
      console.error('=== MUSIC GENERATION FAILED ===')
      console.error('Error:', musicError instanceof Error ? musicError.message : String(musicError))
      console.error('Full error:', musicError)
      console.error('===============================')
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
    console.error('Test generation error:', err)
    return NextResponse.json({ error: 'Generation failed', details: String(err) }, { status: 500 })
  }
}
