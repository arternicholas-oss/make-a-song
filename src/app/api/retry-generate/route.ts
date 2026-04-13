import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Self-healing recovery endpoint.
 *
 * Called by the checkout/success client page if polling still hasn't found a
 * song after the webhook-driven generation should have completed. This covers
 * the case where the webhook fired `/api/generate` fire-and-forget and the
 * generate call silently failed (timeout, Anthropic hiccup, cold start, etc).
 *
 * Safe to call repeatedly — both this endpoint and `/api/generate` guard
 * against duplicate work by checking for an existing song on the order.
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json()
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, paid')
      .eq('session_id', sessionId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.paid) {
      return NextResponse.json({ error: 'Order not paid' }, { status: 403 })
    }

    // Short-circuit: song already exists — nothing to do.
    const { data: existing } = await supabaseAdmin
      .from('songs')
      .select('song_id')
      .eq('order_id', order.id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ status: 'already_generated', songId: existing.song_id })
    }

    // Fire generation. Generate itself is idempotent, so even if this races
    // against an in-flight webhook-triggered generation, we won't double-write.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    fetch(`${appUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(err => console.error('[retry-generate] trigger failed:', err))

    return NextResponse.json({ status: 'triggered' })
  } catch (err) {
    console.error('[retry-generate] error:', err)
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 })
  }
}
