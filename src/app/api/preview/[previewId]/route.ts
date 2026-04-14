import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * GET /api/preview/[previewId] — returns a sanitized preview row.
 *
 * The response MUST NOT include audio_url_full / audio_path_full — those are
 * server-only. Only the 20s preview audio URL is exposed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { previewId: string } }
) {
  const { previewId } = params
  if (!previewId || !previewId.startsWith('prv_')) {
    return NextResponse.json({ error: 'Invalid previewId' }, { status: 400 })
  }

  const { data: preview, error } = await supabaseAdmin
    .from('previews')
    .select('preview_id, title, sections, genre, tone, brand_tone, occasion, is_brand, answers, audio_url_preview, regen_count, max_regens, purchased, promoted_song_id')
    .eq('preview_id', previewId)
    .single()

  if (error || !preview) {
    return NextResponse.json({ error: 'Preview not found' }, { status: 404 })
  }

  const recipientName = preview.is_brand
    ? (preview.answers as any)?.brand_name
    : (preview.answers as any)?.recipient_name

  return NextResponse.json({
    preview_id: preview.preview_id,
    title: preview.title,
    sections: preview.sections,
    recipient_name: recipientName,
    genre: preview.genre,
    tone: preview.is_brand ? preview.brand_tone : preview.tone,
    occasion: preview.occasion,
    is_brand: preview.is_brand,
    audio_url_preview: preview.audio_url_preview,
    regen_count: preview.regen_count,
    max_regens: preview.max_regens,
    regens_remaining: Math.max(0, (preview.max_regens || 0) - (preview.regen_count || 0)),
    purchased: preview.purchased,
    promoted_song_id: preview.promoted_song_id,
  })
}
