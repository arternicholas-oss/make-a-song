import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import SongPageClient from './SongPageClient'

// ─── SERVER: fetch song and generate OG metadata ──────────────────────────────

async function getSong(songId: string) {
  const { data, error } = await supabaseAdmin
    .from('songs')
    .select('*')
    .eq('song_id', songId)
    .single()

  if (error || !data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data
}

export async function generateMetadata(
  { params }: { params: { songId: string } }
): Promise<Metadata> {
  const song = await getSong(params.songId)
  if (!song) return { title: 'Song not found' }

  const title = song.is_brand
    ? `${song.title} — A Brand Anthem for ${song.recipient_name}`
    : `${song.title} — A Song for ${song.recipient_name}`

  const desc = song.is_brand
    ? `A custom AI-written brand anthem for ${song.recipient_name}. Made with Make a Song About You.`
    : `A personalized song written just for ${song.recipient_name}. Made with Make a Song About You.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [`${process.env.NEXT_PUBLIC_APP_URL}/api/og?songId=${params.songId}`],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc,
    },
  }
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default async function SongPage(
  { params }: { params: { songId: string } }
) {
  const song = await getSong(params.songId)
  if (!song) notFound()

  return <SongPageClient song={song} />
}
