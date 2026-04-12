import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  const { songId } = params

  // Look up song to get audio URL
  const { data: song, error } = await supabaseAdmin
    .from('songs')
    .select('audio_url')
    .eq('song_id', songId)
    .single()

  if (error || !song?.audio_url) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 })
  }

  // Fetch the audio from Supabase storage
  const audioRes = await fetch(song.audio_url)
  if (!audioRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 502 })
  }

  const audioBuffer = await audioRes.arrayBuffer()

  // Detect content type from URL extension or response header
  const contentType = audioRes.headers.get('content-type') ||
    (song.audio_url.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg')

  // Check if download was requested
  const dl = req.nextUrl.searchParams.get('dl')
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': audioBuffer.byteLength.toString(),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  }
  if (dl) {
    headers['Content-Disposition'] = `attachment; filename="${songId}.mp3"`
  }

  return new NextResponse(audioBuffer, { headers })
}
