import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { supabaseAdmin } from '@/lib/supabase'
import { serverCapture, EVT, flushServer } from '@/lib/posthog'
import { htmlEscape } from '@/lib/html'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})
const resend = new Resend(process.env.RESEND_API_KEY || '')

/**
 * Refund endpoint for failed or dissatisfied orders.
 *
 * Auth model: requires REFUND_ADMIN_TOKEN header for "admin-initiated" refunds
 * (used by support ops), OR caller supplies matching session_id for automated
 * failure-triggered refunds (internal only).
 *
 * A refund:
 *   - Calls Stripe's refund API
 *   - Updates order status → 'refunded'
 *   - Sends a "your refund is processed" email
 *
 * Does NOT delete song data — we keep audit trail.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { sessionId, reason, adminToken } = body as {
      sessionId?: string
      reason?: string
      adminToken?: string
    }

    if (!sessionId) return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })

    // Auth gate: either admin token OR this is a server-internal call.
    // For safety, we require the admin token for external callers. Internal
    // failure-watcher calls pass the REFUND_ADMIN_TOKEN from env.
    const token = req.headers.get('x-refund-admin-token') || adminToken
    if (!token || token !== process.env.REFUND_ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (order.status === 'refunded') {
      return NextResponse.json({ ok: true, alreadyRefunded: true })
    }

    if (!order.stripe_payment_id) {
      return NextResponse.json({ error: 'No payment to refund' }, { status: 400 })
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_id,
      reason: 'requested_by_customer',
      metadata: {
        session_id: sessionId,
        reason: reason || 'unspecified',
      },
    })

    await supabaseAdmin
      .from('orders')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason || null,
      })
      .eq('id', order.id)

    // Email customer.
    if (order.email) {
      try {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'songs@makeasongaboutyou.com',
          to: order.email,
          subject: 'Your refund is on its way',
          html: `<div style="font-family:'DM Sans',Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FFF9F0;color:#1a1410;">
            <h1 style="font-size:26px;margin:0 0 16px;">Your refund is processing</h1>
            <p style="font-size:16px;line-height:1.6;color:#1a1410;">We've just refunded your order in full ($14.99). It'll land back on your card in 5–10 business days.</p>
            ${reason ? `<p style="font-size:14px;color:#9A8F88;">Reason: ${htmlEscape(reason)}</p>` : ''}
            <p style="font-size:14px;color:#9A8F88;margin-top:24px;">If you have any questions, just reply to this email.</p>
            <p style="font-size:12px;color:#9A8F88;margin-top:32px;">— Make a Song About You</p>
          </div>`,
        })
      } catch (err) {
        console.error('[refund] email failed:', err)
      }
    }

    serverCapture(sessionId, EVT.REFUND_ISSUED, {
      reason: reason || 'unspecified',
      refund_id: refund.id,
    })
    await flushServer()

    return NextResponse.json({ ok: true, refundId: refund.id })
  } catch (err) {
    console.error('[refund] error:', err)
    return NextResponse.json({ error: 'Refund failed' }, { status: 500 })
  }
}
