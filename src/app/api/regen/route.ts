import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { songId } = await req.json()

    if (!songId) {
      return NextResponse.json({ error: 'Missing songId' }, { status: 400 })
    }

    // Fetch existing song and its order
    const { data: song, error: songError } = await supabaseAdmin
      .from('songs')
      .select('*, order_id')
      .eq('song_id', songId)
      .single()

    if (songError || !song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    if (song.regen_count >= 1) {
      return NextResponse.json({ error: 'Regeneration limit reached. Only 1 free regen allowed.' }, { status: 403 })
    }

    // Trigger generation with regen flag
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    const res = await fetch(`${appUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: song.order_id,
        isRegen: true,
        songId: songId,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json({ error: data.error || 'Regen failed' }, { status: res.status })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('Regen error:', err)
    return NextResponse.json({ error: 'Regen failed' }, { status: 500 })
  }
}
