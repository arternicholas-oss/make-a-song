import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'
import type { Answers } from '@/lib/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
})

// ─── Validation helpers ──────────────────────────────────────────────────────
// Basic shape checks to avoid garbage data hitting Supabase / Stripe.
// Not a full schema — just defensive bounds so the endpoint can't be abused
// to insert huge blobs or weird types.
const MAX_STRING_LEN = 2000
const MAX_ANSWERS_KEYS = 40

function isSafeString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && v.length <= MAX_STRING_LEN
}

function validateAnswers(answers: unknown): { ok: true; value: Answers } | { ok: false; error: string } {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return { ok: false, error: 'answers must be an object' }
  }
  const obj = answers as Record<string, unknown>
  const keys = Object.keys(obj)
  if (keys.length === 0) return { ok: false, error: 'answers is empty' }
  if (keys.length > MAX_ANSWERS_KEYS) return { ok: false, error: 'too many answer fields' }
  if (!isSafeString(obj.occasion)) return { ok: false, error: 'invalid occasion' }
  if (!isSafeString(obj.genre)) return { ok: false, error: 'invalid genre' }
  // Every value must be a string under the length cap — prevents nested
  // objects, arrays, or oversized blobs being persisted.
  for (const k of keys) {
    const val = obj[k]
    if (val === null || val === undefined || val === '') continue // optional fields ok
    if (typeof val !== 'string') return { ok: false, error: `field ${k} must be a string` }
    if (val.length > MAX_STRING_LEN) return { ok: false, error: `field ${k} exceeds max length` }
  }
  return { ok: true, value: obj as unknown as Answers }
}

function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { sessionId, email, answers } = body as {
      sessionId?: unknown
      email?: unknown
      answers?: unknown
    }

    if (!isSafeString(sessionId) || sessionId.length > 100) {
      return NextResponse.json({ error: 'Invalid sessionId' }, { status: 400 })
    }
    if (email !== undefined && email !== null && email !== '' && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const answersCheck = validateAnswers(answers)
    if (answersCheck.ok !== true) {
      return NextResponse.json({ error: answersCheck.error }, { status: 400 })
    }
    const validAnswers = answersCheck.value
    const emailStr = isValidEmail(email) ? email : ''

    const isBrand = validAnswers.occasion === 'brand'

    // Save order to Supabase before redirecting to Stripe
    // (so we have the answers even if user abandons checkout)
    const { error: dbError } = await supabaseAdmin
      .from('orders')
      .upsert({
        session_id: sessionId,
        email: emailStr || null,
        paid: false,
        occasion: validAnswers.occasion,
        genre: validAnswers.genre,
        tone: isBrand ? null : (validAnswers as any).tone,
        brand_tone: isBrand ? (validAnswers as any).brand_tone : null,
        answers: validAnswers,
        is_brand: isBrand,
      }, { onConflict: 'session_id' })

    if (dbError) {
      console.error('Supabase error:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Build Stripe checkout session
    const recipientName = isBrand
      ? (validAnswers as any).brand_name
      : (validAnswers as any).recipient_name

    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product: process.env.STRIPE_PRODUCT_ID || '',
          unit_amount: 1499, // $14.99
        },
        quantity: 1,
      }],
      customer_email: emailStr || undefined,
      payment_method_types: ['card'],
      payment_method_options: {
        card: { request_three_d_secure: 'automatic' },
      },
      metadata: {
        session_id: sessionId,
        occasion: validAnswers.occasion,
        recipient_name: recipientName || '',
        is_brand: isBrand ? 'true' : 'false',
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id=${sessionId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/?session_id=${sessionId}&cancelled=true`,
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
