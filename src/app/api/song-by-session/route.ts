import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Called by /checkout/success to poll for song readiness
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
  }

  // Find order by session_id
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, paid')
    .eq('session_id', sessionId)
    .single()

  if (!order || !order.paid) {
    return NextResponse.json({ songId: null })
  }

  // Check if song has been generated
  const { data: song } = await supabaseAdmin
    .from('songs')
    .select('song_id, audio_url')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({
    songId: song?.song_id || null,
    audioUrl: song?.audio_url || null,
  })
}
