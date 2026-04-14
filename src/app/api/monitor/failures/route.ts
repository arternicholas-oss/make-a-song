import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { Resend } from 'resend'
import { serverCapture, EVT, flushServer } from '@/lib/posthog'

const resend = new Resend(process.env.RESEND_API_KEY || '')

/**
 * Cron-hit endpoint that catches stuck orders.
 *
 * Rule: if an order has been in status='generating' for > 3 minutes and has
 * no corresponding song row, flag it as 'failed' and notify the buyer. In the
 * preview-first flow this should effectively never trigger (webhook promotes
 * synchronously), so any hit here is a real ops incident worth attention.
 *
 * How to wire up:
 *   Vercel Cron → GET /api/monitor/failures (every minute)
 *   Auth: CRON_SECRET header must match env var.
 */

const STUCK_THRESHOLD_SECONDS = 180

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_SECONDS * 1000).toISOString()

  const { data: stuck, error } = await supabaseAdmin
    .from('orders')
    .select('id, session_id, email, generation_started_at, status, preview_id')
    .eq('status', 'generating')
    .lt('generation_started_at', cutoff)

  if (error) {
    console.error('[monitor] query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const flagged: string[] = []
  for (const order of stuck || []) {
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString(),
        failure_reason: 'timed_out_180s',
      })
      .eq('id', order.id)

    flagged.push(order.id)

    if (order.email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'songs@makeasongaboutyou.com',
          to: order.email,
          subject: 'We hit a snag with your song — refund incoming',
          html: `<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FFF9F0;color:#1a1410;">
            <h1 style="font-size:24px;margin:0 0 12px;">Something went wrong.</h1>
            <p style="font-size:16px;line-height:1.6;">We couldn't finish generating your song. Our systems flagged the order, and we're refunding your $14.99 — it'll land in 5–10 business days.</p>
            <p style="font-size:16px;line-height:1.6;">If you'd like to try again, start fresh at <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color:#FF6B6B;">makeasongaboutyou.com</a>.</p>
            <p style="font-size:14px;color:#9A8F88;margin-top:24px;">Sorry about this. Reply to this email if we can help another way.</p>
          </div>`,
        })
      } catch (err) {
        console.error('[monitor] failure email failed:', err)
      }
    }

    serverCapture(order.session_id, EVT.GENERATION_FAILED, {
      order_id: order.id,
      reason: 'timed_out_180s',
    })

    // Fire refund internally. Don't block on success; the monitor endpoint
    // will re-scan and the admin will see unrefunded failed orders in the DB.
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-refund-admin-token': process.env.REFUND_ADMIN_TOKEN || '',
        },
        body: JSON.stringify({
          sessionId: order.session_id,
          reason: 'auto_refund_generation_timeout',
        }),
      })
    } catch (err) {
      console.error('[monitor] refund trigger failed:', err)
    }
  }

  await flushServer()

  return NextResponse.json({
    scanned: (stuck || []).length,
    flagged,
  })
}
