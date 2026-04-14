import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * M2: Cron-hit endpoint that prunes expired, unpurchased previews.
 *
 * Rule: previews with expires_at < now() that were never promoted to a song
 * (purchased=false, promoted_song_id=null) get their audio files deleted and
 * the DB row removed. Purchased previews are kept for audit.
 *
 * Wire up: Vercel Cron → GET /api/monitor/cleanup-previews (daily).
 * Auth: x-cron-secret header must match CRON_SECRET env.
 */

export async function GET(req: NextRequest) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const nowIso = new Date().toISOString()

  const { data: expired, error } = await supabaseAdmin
    .from('previews')
    .select('preview_id, audio_path_preview, audio_path_full')
    .lt('expires_at', nowIso)
    .eq('purchased', false)
    .is('promoted_song_id', null)
    .limit(500)   // bounded per-run so we never stall the cron

  if (error) {
    console.error('[cleanup-previews] query failed:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  const deleted: string[] = []

  for (const row of expired || []) {
    // Delete storage objects best-effort. If they're already gone, shrug.
    const privatePath = row.audio_path_full ? [row.audio_path_full] : []
    const publicPath = row.audio_path_preview ? [row.audio_path_preview] : []

    if (privatePath.length) {
      await supabaseAdmin.storage.from('songs-audio-private').remove(privatePath).catch(() => {})
    }
    if (publicPath.length) {
      await supabaseAdmin.storage.from('previews-audio').remove(publicPath).catch(() => {})
    }

    const { error: delErr } = await supabaseAdmin
      .from('previews')
      .delete()
      .eq('preview_id', row.preview_id)

    if (!delErr) deleted.push(row.preview_id)
  }

  return NextResponse.json({
    scanned: (expired || []).length,
    deleted: deleted.length,
  })
}
