import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { GENRE_LABELS } from '@/lib/prompts'

const resend = new Resend(process.env.RESEND_API_KEY || '')

/**
 * Fired by the webhook after a preview is promoted to a song. Sends the
 * buyer their song link + lyrics + link to the audio.
 *
 * Idempotent: if called twice, we just send the email twice — acceptable
 * failure mode vs complex dedupe. Email providers dedupe on server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const { songId } = await req.json()
    if (!songId) return NextResponse.json({ error: 'Missing songId' }, { status: 400 })

    const { data: song } = await supabaseAdmin
      .from('songs')
      .select('*, orders(email)')
      .eq('song_id', songId)
      .single()

    if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 })

    const to = (song as any).email || (song as any).orders?.email
    if (!to) return NextResponse.json({ error: 'No email on record' }, { status: 400 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const songUrl = `${appUrl}/song/${songId}`
    const recipientName = song.recipient_name || ''
    const isBrand = song.is_brand
    const songTitle = song.title || 'Your Song'
    const genre = GENRE_LABELS[song.genre] || song.genre
    const tone = song.tone

    const lyricsHtml = (song.sections || [])
      .map((s: { label: string; lines: string[] }) => `
        <div style="margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#9A8F88;margin-bottom:10px;">${s.label}</div>
          ${s.lines.map(l => `<div style="font-size:18px;line-height:1.7;color:#1a1410;">${l}</div>`).join('')}
        </div>
      `)
      .join('')

    const subject = isBrand
      ? `Your brand anthem for ${recipientName} is ready 🎵`
      : `Your song for ${recipientName} is ready 🎵`

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'songs@makeasongaboutyou.com',
      to,
      subject,
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#FFF9F0;margin:0;padding:0;font-family:'DM Sans',Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:40px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#FF6B6B;margin-bottom:8px;">
        ${isBrand ? 'Your Brand Anthem' : 'Your Personalized Song'}
      </div>
      <h1 style="font-size:32px;font-weight:700;color:#1a1410;margin:0 0 8px;font-style:italic;">${songTitle}</h1>
      <p style="font-size:15px;color:#9A8F88;margin:0;">
        ${isBrand ? `A theme song for ${recipientName}` : `written for ${recipientName}`}
      </p>
      <p style="font-size:13px;color:#9A8F88;margin:8px 0 0;">${genre} · ${tone}</p>
    </div>

    <div style="background:#fff;border:2px solid #EDE8E0;border-radius:16px;padding:32px;margin-bottom:32px;">
      ${lyricsHtml}
    </div>

    <div style="text-align:center;margin-bottom:40px;">
      <a href="${songUrl}" style="display:inline-block;background:linear-gradient(135deg,#FF6B6B,#FF9F43);color:#fff;text-decoration:none;padding:16px 40px;border-radius:99px;font-weight:700;font-size:16px;margin-bottom:16px;">
        View Your Song →
      </a>
      <br>
      <p style="font-size:13px;color:#9A8F88;margin:12px 0 0;">
        This link is yours. Share it, bookmark it, or send it to ${recipientName}.
      </p>
    </div>

    <div style="text-align:center;font-size:12px;color:#9A8F88;">
      <p>Make a Song About You · <a href="${appUrl}" style="color:#FF6B6B;text-decoration:none;">makeasongaboutyou.com</a></p>
      <p style="margin-top:4px;">Need help? Reply to this email or see our <a href="${appUrl}/refund" style="color:#FF6B6B;">refund policy</a>.</p>
    </div>
  </div>
</body></html>`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[email/song-ready] error:', err)
    return NextResponse.json({ error: 'Email failed' }, { status: 500 })
  }
}
