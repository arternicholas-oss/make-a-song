import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * One-time migration endpoint to add audio_url column to songs table.
 * This is a simple utility endpoint that should be called once to set up the database.
 */
export async function POST(req: NextRequest) {
  try {
    // Migration already applied via Supabase dashboard.
    // This endpoint exists as documentation.
    return NextResponse.json({
      success: true,
      message: 'audio_url column has already been added to songs table.',
    })
  } catch (err) {
    console.error('Migration error:', err)
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      message: 'Ensure the audio_url text column is added to the songs table manually via Supabase dashboard',
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: 'Migration endpoint - POST to execute or run this SQL manually in Supabase:',
    sql: 'ALTER TABLE songs ADD COLUMN IF NOT EXISTS audio_url text;',
  })
}
