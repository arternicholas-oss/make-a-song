// ─── QUESTIONNAIRE ANSWERS ───────────────────────────────────────────────────

export interface PersonalAnswers {
  occasion: string
  genre: string
  tone: string
  recipient_name: string
  sender_name?: string
  relationship: string
  word1: string
  word2: string
  word3: string
  what_makes_special: string
  favorite_memory?: string
  something_funny?: string
  catchphrase?: string
  hobby?: string
  city?: string
}

export interface BrandAnswers {
  occasion: 'brand'
  genre: string
  brand_tone: string
  brand_name: string
  brand_industry: string
  brand_what: string
  brand_tagline?: string
  brand_audience?: string
  brand_vibe?: string
  brand_differentiator?: string
  brand_location?: string
  brand_cta?: string
}

export type Answers = PersonalAnswers | BrandAnswers

// ─── SONG STRUCTURE ───────────────────────────────────────────────────────────

export interface SongSection {
  label: string
  lines: string[]
}

export interface Song {
  song_id: string
  title: string
  sections: SongSection[]
  recipient_name: string
  genre: string
  tone: string
  occasion: string
  is_brand: boolean
  created_at: string
  expires_at: string
  audio_url?: string
}

// ─── DATABASE ROWS ────────────────────────────────────────────────────────────

export interface OrderRow {
  id: string
  session_id: string
  stripe_session_id?: string
  stripe_payment_id?: string
  email?: string
  paid: boolean
  occasion: string
  genre: string
  tone?: string
  brand_tone?: string
  answers: Answers
  is_brand: boolean
  created_at: string
}

export interface SongRow extends Song {
  id: string
  order_id: string
  regen_count: number
  audio_url?: string
}
