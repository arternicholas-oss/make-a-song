import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  const { songId } = params

  if (!songId) {
    return NextResponse.json({ error: 'Missing song ID' }, { status: 400 })
  }

  const { data: songData, error } = await supabaseAdmin
    .from('songs')
    .select('*')
    .eq('song_id', songId)
    .single()

  if (error || !songData) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 })
  }

  // Check expiry
  if (songData.expires_at && new Date(songData.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Song has expired' }, { status: 410 })
  }

  // Ensure audio_url is included in response
  const song = {
    ...songData,
    audio_url: songData.audio_url || undefined,
  }

  return NextResponse.json({ song })
}
