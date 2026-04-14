import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * Gated audio proxy.
 *
 * The full-length audio lives in the PRIVATE `songs-audio-private` bucket
 * (or legacy `songs-audio` for pre-migration songs). We:
 *   1. Look up the song and its parent order
 *   2. Refuse to serve unless order.status == 'completed' AND order.paid
 *   3. Create a short-lived signed URL to the underlying storage object
 *   4. Proxy the bytes (so the signed URL never reaches the browser)
 *
 * Pre-purchase clients should use audio_url_preview from the preview row
 * (20s clip in the public bucket), not this endpoint.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { songId: string } }
) {
  const { songId } = params
  if (!songId) {
    return NextResponse.json({ error: 'Missing songId' }, { status: 400 })
  }

  // Look up song + linked order.
  const { data: song, error: songErr } = await supabaseAdmin
    .from('songs')
    .select('song_id, order_id, audio_url, preview_id')
    .eq('song_id', songId)
    .single()

  if (songErr || !song) {
    return NextResponse.json({ error: 'Song not found' }, { status: 404 })
  }

  let paid = false
  if (song.order_id) {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('paid, status')
      .eq('id', song.order_id)
      .single()
    paid = !!order?.paid && (order?.status ? ['paid', 'generating', 'completed'].includes(order.status) : true)
  }

  if (!paid) {
    return NextResponse.json({ error: 'Audio locked — purchase to unlock' }, { status: 402 })
  }

  // Resolve the audio bytes. Prefer freshly signed URLs to the PRIVATE bucket
  // (ignores the 7-day signed URL stored on song.audio_url — that could be
  // expired by the time this is hit, and we can always re-sign in seconds).
  //   1. Preview-first flow songs live at {preview_id}.mp3
  //   2. Legacy /api/generate songs (M1) live at {song_id}.mp3
  //   3. Truly old public-bucket songs fall back to audio_url
  let audioUrl = ''
  let contentType = 'audio/mpeg'

  const pathCandidates: string[] = []
  if (song.preview_id) pathCandidates.push(`${song.preview_id}.mp3`)
  pathCandidates.push(`${song.song_id}.mp3`)

  for (const path of pathCandidates) {
    const { data: signed } = await supabaseAdmin.storage
      .from('songs-audio-private')
      .createSignedUrl(path, 300)   // 5 min
    if (signed?.signedUrl) {
      audioUrl = signed.signedUrl
      break
    }
  }

  if (!audioUrl && song.audio_url) {
    // M5 fix: if we fall back to a stored URL, log it so we know legacy
    // public-bucket audio is being served (and can migrate those rows later).
    console.warn('[audio] falling back to stored audio_url for song', songId)
    audioUrl = song.audio_url
  }

  if (!audioUrl) {
    return NextResponse.json({ error: 'Audio not found' }, { status: 404 })
  }

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) {
    return NextResponse.json({ error: 'Failed to fetch audio' }, { status: 502 })
  }

  const audioBuffer = await audioRes.arrayBuffer()
  contentType =
    audioRes.headers.get('content-type') ||
    (audioUrl.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg')

  const dl = req.nextUrl.searchParams.get('dl')
  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'Content-Length': audioBuffer.byteLength.toString(),
    'Accept-Ranges': 'bytes',
    // L3: cap browser cache at the signed URL lifetime (5 min). If we cache
    // longer and the order flips to 'refunded', the browser would still serve
    // the old audio for up to an hour.
    'Cache-Control': 'private, max-age=300',
  }
  if (dl) {
    headers['Content-Disposition'] = `attachment; filename="${songId}.mp3"`
  }

  return new NextResponse(audioBuffer, { headers })
}
