'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

// ─────────────────────────────────────────────────────────────────────────────
// After Stripe redirects back here, we poll Supabase for the generated song.
// The webhook fires → generate route runs → song saved → we redirect to /song/[id]
// ─────────────────────────────────────────────────────────────────────────────

const LOAD_LINES = [
  'Warming up the studio… 🎹',
  'Weaving in that memory you shared… ✍️',
  'Finding the perfect rhyme… 🎯',
  'Setting the groove… 🎸',
  'Polishing the chorus… ✨',
  'Almost there… 🎶',
]

export default function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session_id')

  const [loadLine, setLoadLine] = useState(0)
  const [error, setError] = useState('')

  // Cycle loading messages
  useEffect(() => {
    const t = setInterval(() => setLoadLine(l => (l + 1) % LOAD_LINES.length), 1800)
    return () => clearInterval(t)
  }, [])

  // Poll for the song every 2 seconds, up to 60 seconds
  useEffect(() => {
    if (!sessionId) { setError('Missing session. Please check your email for your song link.'); return }

    let attempts = 0
    const maxAttempts = 30 // 30 × 2s = 60s timeout

    const poll = async () => {
      try {
        const res = await fetch(`/api/song-by-session?session_id=${sessionId}`)
        if (res.ok) {
          const { songId } = await res.json()
          if (songId) {
            router.replace(`/song/${songId}`)
            return
          }
        }
      } catch {}

      attempts++
      if (attempts >= maxAttempts) {
        setError('Your song is taking a little longer than expected. Check your email — we\'ll send it there too.')
        return
      }

      setTimeout(poll, 2000)
    }

    setTimeout(poll, 2000) // First check after 2s
  }, [sessionId, router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
      background: '#FFF9F0',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {error ? (
        <div style={{ maxWidth: 440 }}>
          <div style={{ fontSize: 48, marginBottom: 24 }}>📧</div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700, color: '#1a1410', marginBottom: 12 }}>
            Still writing…
          </h2>
          <p style={{ fontSize: 16, color: '#9A8F88', lineHeight: 1.6 }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Spinning vinyl */}
          <div style={{ position: 'relative', width: 110, height: 110, marginBottom: 40 }}>
            <div style={{
              width: 110, height: 110, borderRadius: '50%',
              background: 'conic-gradient(#FF6B6B, #FFD93D, #6BCB77, #4ECDC4, #C77DFF, #FF9F43, #FF6B6B)',
              animation: 'spin 1.8s linear infinite',
            }} />
            <div style={{ position: 'absolute', top: '22%', left: '22%', right: '22%', bottom: '22%', borderRadius: '50%', background: '#FFF9F0' }} />
            <div style={{ position: 'absolute', top: '44%', left: '44%', right: '44%', bottom: '44%', borderRadius: '50%', background: '#1a1410' }} />
          </div>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 34, fontWeight: 700, color: '#1a1410', marginBottom: 14 }}>
            Writing your song…
          </h2>
          <p style={{ fontSize: 16, color: '#9A8F88', animation: 'pulse 1.8s ease infinite' }}>
            {LOAD_LINES[loadLine]}
          </p>
          <p style={{ fontSize: 13, color: '#9A8F88', marginTop: 40 }}>
            We&apos;ll also email it to you so you never lose it.
          </p>
        </>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700&family=DM+Sans:wght@400&display=swap');
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.45;} }
      `}</style>
    </div>
  )
}
