import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

// Required: disable Next.js body parsing so Stripe can verify signature
export const config = { api: { bodyParser: false } }

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
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
    if (!sessionId) {
      console.error('No session_id in Stripe metadata')
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    // Mark order as paid
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({
        paid: true,
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

    // Trigger song generation asynchronously
    // Using fetch to our own generate endpoint so it runs in background
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    fetch(`${appUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id }),
    }).catch(err => console.error('Generation trigger failed:', err))
  }

  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent
    console.error('Payment failed:', paymentIntent.id)
    // Could send a "payment failed" email here via Resend
  }

  return NextResponse.json({ received: true })
}
