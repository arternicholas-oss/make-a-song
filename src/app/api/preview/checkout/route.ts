import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import { serverCapture, EVT, flushServer } from '@/lib/posthog'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

/**
 * Create a Stripe Checkout session for an already-generated preview.
 *
 * Unlike /api/create-checkout (which is the legacy flow), this endpoint:
 *   - Requires a previewId that already exists in the DB
 *   - Uses the email captured at preview time
 *   - Stores both preview_id and session_id in Stripe metadata so the webhook
 *     can promote the preview into a song without regenerating
 *   - Creates the order row with status='draft' and preview_id set
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const previewId = body?.previewId
    const sessionId = body?.sessionId

    if (typeof previewId !== 'string' || !previewId.startsWith('prv_')) {
      return NextResponse.json({ error: 'Invalid previewId' }, { status: 400 })
    }
    if (typeof sessionId !== 'string' || !sessionId) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }

    // Fetch preview.
    const { data: preview, error: previewErr } = await supabaseAdmin
      .from('previews')
      .select('*')
      .eq('preview_id', previewId)
      .single()

    if (previewErr || !preview) {
      return NextResponse.json({ error: 'Preview not found' }, { status: 404 })
    }

    if (preview.session_id !== sessionId) {
      return NextResponse.json({ error: 'Preview not owned by this session' }, { status: 403 })
    }

    if (preview.purchased) {
      return NextResponse.json({ error: 'Already purchased' }, { status: 409 })
    }

    const isBrand = preview.is_brand
    const recipientName = isBrand
      ? (preview.answers as any).brand_name
      : (preview.answers as any).recipient_name

    // Upsert an order row tied to this preview.
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .upsert(
        {
          session_id: sessionId,
          email: preview.email,
          paid: false,
          status: 'draft',
          preview_id: previewId,
          occasion: preview.occasion,
          genre: preview.genre,
          tone: isBrand ? null : preview.tone,
          brand_tone: isBrand ? preview.brand_tone : null,
          answers: preview.answers,
          is_brand: isBrand,
        },
        { onConflict: 'session_id' }
      )

    if (dbError) {
      console.error('[preview/checkout] order upsert failed:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product: process.env.STRIPE_PRODUCT_ID || '',
            unit_amount: 1499,
          },
          quantity: 1,
        },
      ],
      customer_email: preview.email,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { request_three_d_secure: 'automatic' },
      },
      metadata: {
        session_id: sessionId,
        preview_id: previewId,
        occasion: preview.occasion,
        recipient_name: recipientName || '',
        is_brand: isBrand ? 'true' : 'false',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id=${sessionId}&preview_id=${previewId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?session_id=${sessionId}&preview_id=${previewId}&cancelled=true`,
      allow_promotion_codes: true,
    })

    await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: stripeSession.id })
      .eq('session_id', sessionId)

    serverCapture(sessionId, EVT.CHECKOUT_STARTED, {
      preview_id: previewId,
      amount_cents: 1499,
    })
    await flushServer()

    return NextResponse.json({ url: stripeSession.url })
  } catch (err) {
    console.error('[preview/checkout] error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
