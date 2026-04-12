import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import type { Answers } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { sessionId, email, answers }: {
      sessionId: string
      email: string
      answers: Answers
    } = body

    if (!sessionId || !answers) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const isBrand = answers.occasion === 'brand'

    // Save order to Supabase before redirecting to Stripe
    // (so we have the answers even if user abandons checkout)
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .upsert({
        session_id: sessionId,
        email: email || null,
        paid: false,
        occasion: answers.occasion,
        genre: answers.genre,
        tone: isBrand ? null : (answers as any).tone,
        brand_tone: isBrand ? (answers as any).brand_tone : null,
        answers,
        is_brand: isBrand,
      }, { onConflict: 'session_id' })

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Build Stripe checkout session
    const recipientName = isBrand
      ? (answers as any).brand_name
      : (answers as any).recipient_name

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID || '',
        quantity: 1,
      }],
      customer_email: email || undefined,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { request_three_d_secure: 'automatic' },
      },
      metadata: {
        session_id: sessionId,
        occasion: answers.occasion,
        recipient_name: recipientName || '',
        is_brand: isBrand ? 'true' : 'false',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id=${sessionId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/create?session_id=${sessionId}&cancelled=true`,
      allow_promotion_codes: true,
    })

    // Save Stripe session ID to our order
    await supabaseAdmin
      .from('orders')
      .update({ stripe_session_id: stripeSession.id })
      .eq('session_id', sessionId)

    return NextResponse.json({ url: stripeSession.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
