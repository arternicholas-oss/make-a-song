import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { serverCapture, EVT, flushServer } from '@/lib/posthog'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ received: true })
    }

    const sessionId = session.metadata?.session_id
    const previewId = session.metadata?.preview_id   // new: preview-first flow

    if (!sessionId) {
      console.error('No session_id in Stripe metadata')
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    // Mark order paid.
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({
        paid: true,
        status: 'paid',
        stripe_payment_id: session.payment_intent as string,
        email: session.customer_email || undefined,
        stripe_session_id: session.id,
      })
      .eq('session_id', sessionId)
      .select()
      .single()

    if (orderError || !order) {
      console.error('Failed to update order:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ─── PREVIEW-FIRST FLOW ──────────────────────────────────────────────────
    // If this order came from a preview, promote the preview into a song
    // directly (no regeneration; the user already approved the audio).
    if (previewId) {
      const promoted = await promotePreviewToSong(previewId, order.id, order.email || undefined)
      if (promoted.ok) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'completed',
            generation_completed_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        serverCapture(sessionId, EVT.CHECKOUT_COMPLETED, {
          preview_id: previewId,
          song_id: promoted.songId,
          flow: 'preview_first',
        })
        await flushServer()
        return NextResponse.json({ received: true, songId: promoted.songId, flow: 'preview_first' })
      }

      // B2 fix: promote failed. Do NOT silently regenerate a brand-new song
      // via the legacy /api/generate path — that would deliver a song that
      // doesn't match the preview the customer paid for. Flag the order as
      // failed and let the failure-monitor cron auto-refund and email the
      // customer.
      const promoteErr = promoted.ok === false ? promoted.error : 'unknown'
      console.error('[webhook] promote failed — flagging order as failed for auto-refund:', promoteErr)
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: `promote_failed: ${promoteErr}`.slice(0, 200),
        })
        .eq('id', order.id)
      serverCapture(sessionId, EVT.GENERATION_FAILED, {
        order_id: order.id,
        preview_id: previewId,
        reason: 'promote_failed',
      })
      // Kick the refund immediately instead of waiting for the cron sweep, so
      // the customer sees the apology email in seconds, not up to a minute.
      const appUrl = process.env.NEXT_PUBLIC_APP_URL
      const adminToken = process.env.REFUND_ADMIN_TOKEN
      if (appUrl && adminToken) {
        fetch(`${appUrl}/api/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-refund-admin-token': adminToken,
          },
          body: JSON.stringify({
            sessionId,
            reason: 'auto_refund_promote_failed',
          }),
        }).catch(err => console.error('[webhook] refund trigger failed:', err))
      }
      await flushServer()
      return NextResponse.json({ received: true, flow: 'promote_failed', willRefund: true })
    }

    // ─── LEGACY FLOW (no preview, kick off generation) ───────────────────────
    const { data: existingSong } = await supabaseAdmin
      .from('songs')
      .select('song_id')
      .eq('order_id', order.id)
      .limit(1)
      .maybeSingle()

    if (existingSong) {
      console.log('[webhook] Song already exists for order', order.id, '- skipping regenerate')
      return NextResponse.json({ received: true, alreadyGenerated: true })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'generating',
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    fetch(`${appUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(err => console.error('Generation trigger failed:', err))

    serverCapture(sessionId, EVT.CHECKOUT_COMPLETED, {
      flow: 'legacy_generate',
    })
    await flushServer()
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    console.error('Payment failed:', paymentIntent.id)
  }

  return NextResponse.json({ received: true })
}

// ─── PROMOTE PREVIEW → SONG ────────────────────────────────────────────────
/**
 * Convert a paid preview into a song row. Copies lyrics and audio path, then
 * fires the post-purchase email.
 */
async function promotePreviewToSong(
  previewId: string,
  orderId: string,
  email: string | undefined
): Promise<{ ok: true; songId: string } | { ok: false; error: string }> {
  const { data: preview, error: fetchErr } = await supabaseAdmin
    .from('previews')
    .select('*')
    .eq('preview_id', previewId)
    .single()

  if (fetchErr || !preview) {
    return { ok: false, error: 'preview not found' }
  }

  // Idempotency: if already promoted, return the existing song.
  if (preview.promoted_song_id) {
    return { ok: true, songId: preview.promoted_song_id }
  }

  // Generate song_id. We re-use the preview_id tail to keep storage paths
  // consistent (the audio file is at previewId.mp3 in songs-audio-private).
  const { generateSongId } = await import('@/lib/prompts')
  const songId = generateSongId()

  // Get a public URL to the private bucket for legacy compatibility with
  // audio_url column. We'll still gate access via /api/audio, but some
  // consumers (email template) use audio_url directly. Use a long-expiry
  // signed URL (7 days).
  let audioUrl: string | undefined
  if (preview.audio_path_full) {
    const { data: signed } = await supabaseAdmin.storage
      .from('songs-audio-private')
      .createSignedUrl(preview.audio_path_full, 60 * 60 * 24 * 7)
    audioUrl = signed?.signedUrl
  }

  const recipientName = preview.is_brand
    ? (preview.answers as any)?.brand_name
    : (preview.answers as any)?.recipient_name

  const { error: insertErr } = await supabaseAdmin.from('songs').insert({
    song_id: songId,
    order_id: orderId,
    preview_id: previewId,
    title: preview.title,
    sections: preview.sections,
    recipient_name: recipientName,
    genre: preview.genre,
    tone: preview.is_brand ? preview.brand_tone : preview.tone,
    occasion: preview.occasion,
    is_brand: preview.is_brand,
    regen_count: 0,
    audio_url: audioUrl,
    email: email || preview.email,
  })

  if (insertErr) {
    return { ok: false, error: `song insert: ${insertErr.message}` }
  }

  // Mark preview as purchased and link to song.
  await supabaseAdmin
    .from('previews')
    .update({ purchased: true, promoted_song_id: songId })
    .eq('preview_id', previewId)

  // Fire the post-purchase email (fire-and-forget so webhook stays fast).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const internalSecret = process.env.INTERNAL_API_SECRET || process.env.REFUND_ADMIN_TOKEN || ''
  fetch(`${appUrl}/api/email/song-ready`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({ songId }),
  }).catch(err => console.error('[webhook] email trigger failed:', err))

  return { ok: true, songId }
}
