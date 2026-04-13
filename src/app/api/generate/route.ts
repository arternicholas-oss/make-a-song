import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { buildPrompt, parseSong, generateSongId } from '@/lib/prompts'
import { GENRE_LABELS } from '@/lib/prompts'
import { generateMusic } from '@/lib/lyria'
import type { Answers } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' })
const resend = new Resend(process.env.RESEND_API_KEY || '')

export async function POST(req: NextRequest) {
  try {
    const { orderId, isRegen, songId: existingSongId } = await req.json()

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    // Fetch order from Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.paid) {
      return NextResponse.json({ error: 'Order not paid' }, { status: 403 })
    }

    // ─── Idempotency guard ─────────────────────────────────────────────────────
    // If a song already exists for this order and this is NOT a regeneration,
    // short-circuit so duplicate webhook deliveries / retry-generate calls don't
    // produce duplicate songs (and don't burn Anthropic/Lyria credits twice).
    if (!isRegen) {
      const { data: existing } = await supabaseAdmin
        .from('songs')
        .select('song_id, title, sections, recipient_name, genre, tone, occasion, is_brand, audio_url')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (existing) {
        return NextResponse.json({
          success: true,
          songId: existing.song_id,
          song: existing,
          deduped: true,
        })
      }
    }

    // For regenerations: check regen count
    if (isRegen && existingSongId) {
      const { data: existingSong } = await supabaseAdmin
        .from('songs')
        .select('regen_count')
        .eq('song_id', existingSongId)
        .single()

      if (existingSong && existingSong.regen_count >= 1) {
        return NextResponse.json({ error: 'Regeneration limit reached' }, { status: 403 })
      }

      // Increment regen count on existing song
      await supabaseAdmin
        .from('songs')
        .update({ regen_count: (existingSong?.regen_count || 0) + 1 })
        .eq('song_id', existingSongId)
    }

    const answers = order.answers as Answers
    const isBrand = order.is_brand

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

    // Validate output has minimum structure
    if (!parsed.title || parsed.sections.length < 3) {
      // Retry once
      const retryMessage = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      })
      const retryText = retryMessage.content.map(b => (b.type === 'text' ? b.text : '')).join('\n')
      Object.assign(parsed, parseSong(retryText))
    }

    const songId = generateSongId()
    const recipientName = isBrand
      ? (answers as any).brand_name
      : (answers as any).recipient_name

    // Save song to Supabase
    const { data: song, error: songError } = await supabaseAdmin
      .from('songs')
      .insert({
        song_id: songId,
        order_id: orderId,
        title: parsed.title,
        sections: parsed.sections,
        recipient_name: recipientName,
        genre: order.genre,
        tone: isBrand ? order.brand_tone : order.tone,
        occasion: order.occasion,
        is_brand: isBrand,
        regen_count: 0,
      })
      .select()
      .single()

    if (songError) {
      console.error('Failed to save song:', songError)
      return NextResponse.json({ error: 'Failed to save song' }, { status: 500 })
    }

    let audioUrl: string | undefined

    // Attempt to generate music with Lyria (non-critical failure)
    try {
      // Convert lyrics sections to plain text for Lyria
      const lyricsText = parsed.sections
        .map(s => `[${s.label}]\n${s.lines.join('\n')}`)
        .join('\n\n')

      console.log('Starting music generation for song:', songId)
      const musicResponse = await generateMusic(
        lyricsText,
        order.genre,
        isBrand ? order.brand_tone : order.tone,
        parsed.title
      )

      // Convert base64 to buffer for upload
      const audioBuffer = Buffer.from(musicResponse.audioBase64, 'base64')

      // Upload to Supabase Storage
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
        // Get public URL
        const { data } = supabaseAdmin.storage.from('songs-audio').getPublicUrl(audioPath)
        audioUrl = data?.publicUrl

        if (audioUrl) {
          console.log('Audio uploaded successfully:', audioUrl)

          // Update song with audio_url
          const { error: updateError } = await supabaseAdmin
            .from('songs')
            .update({ audio_url: audioUrl })
            .eq('song_id', songId)

          if (updateError) {
            console.error('Failed to update song with audio URL:', updateError)
          }
        }
      }
    } catch (musicError) {
      // Log the error but don't fail the request - song should still work without audio
      console.error('Music generation error (non-critical):', musicError)
    }

    // Send email via Resend
    if (order.email) {
      await sendSongEmail({
        to: order.email,
        recipientName,
        songTitle: parsed.title,
        songId,
        genre: GENRE_LABELS[order.genre] || order.genre,
        tone: isBrand ? order.brand_tone : order.tone,
        sections: parsed.sections,
        isBrand,
      })
    }

    return NextResponse.json({
      success: true,
      songId,
      song: {
        song_id: songId,
        title: parsed.title,
        sections: parsed.sections,
        recipient_name: recipientName,
        genre: order.genre,
        tone: isBrand ? order.brand_tone : order.tone,
        occasion: order.occasion,
        is_brand: isBrand,
        audio_url: audioUrl,
      },
    })
  } catch (err) {
    console.error('Generation error:', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}

// ─── EMAIL ────────────────────────────────────────────────────────────────────

async function sendSongEmail({
  to, recipientName, songTitle, songId, genre, tone, sections, isBrand,
}: {
  to: string
  recipientName: string
  songTitle: string
  songId: string
  genre: string
  tone: string
  sections: { label: string; lines: string[] }[]
  isBrand: boolean
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const songUrl = `${appUrl}/song/${songId}`

  const lyricsHtml = sections.map(s => `
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9A8F88;margin-bottom:10px;">${s.label}</div>
      ${s.lines.map(l => `<div style="font-size:18px;line-height:1.7;color:#1a1410;">${l}</div>`).join('')}
    </div>
  `).join('')

  const subject = isBrand
    ? `Your brand anthem for ${recipientName} is ready 🎵`
    : `Your song for ${recipientName} is ready 🎵`

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'songs@makeasong.com',
    to,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="background:#FFF9F0;margin:0;padding:0;font-family:'DM Sans',Helvetica,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:40px;">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#FF6B6B;margin-bottom:8px;">
              ${isBrand ? 'Your Brand Anthem' : 'Your Personalized Song'}
            </div>
            <h1 style="font-size:32px;font-weight:700;color:#1a1410;margin:0 0 8px;font-style:italic;">
              ${songTitle}
            </h1>
            <p style="font-size:15px;color:#9A8F88;margin:0;">
              ${isBrand ? `A theme song for ${recipientName}` : `written for ${recipientName}`}
            </p>
            <p style="font-size:13px;color:#9A8F88;margin:8px 0 0;">${genre} · ${tone}</p>
          </div>

          <!-- Lyrics -->
          <div style="background:#fff;border:2px solid #EDE8E0;border-radius:16px;padding:32px;margin-bottom:32px;">
            ${lyricsHtml}
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:40px;">
            <a href="${songUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#FF6B6B,#FF9F43);color:#fff;text-decoration:none;padding:16px 40px;border-radius:99px;font-weight:700;font-size:16px;margin-bottom:16px;">
              View Your Song →
            </a>
            <br>
            <p style="font-size:13px;color:#9A8F88;margin:12px 0 0;">
              This link is yours. Share it, bookmark it, or send it to ${recipientName}.
            </p>
          </div>

          <!-- Waitlist -->
          <div style="background:#f5f0ff;border:2px solid #e0d5ff;border-radius:16px;padding:24px;text-align:center;margin-bottom:40px;">
            <p style="font-size:15px;font-weight:600;color:#1a1410;margin:0 0 8px;">Want this performed by a real musician?</p>
            <p style="font-size:13px;color:#7c6f9f;margin:0 0 16px;">We're building a marketplace of artists who will bring your song to life. Join the waitlist.</p>
            <a href="${appUrl}/waitlist?song=${songId}"
               style="display:inline-block;background:#8B5CF6;color:#fff;text-decoration:none;padding:12px 28px;border-radius:99px;font-weight:600;font-size:14px;">
              Join the Waitlist →
            </a>
          </div>

          <!-- Footer -->
          <div style="text-align:center;font-size:12px;color:#9A8F88;">
            <p>Make a Song About You · <a href="${appUrl}" style="color:#FF6B6B;text-decoration:none;">makeasong.com</a></p>
            <p style="margin-top:4px;">Your song link expires in 30 days.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}
