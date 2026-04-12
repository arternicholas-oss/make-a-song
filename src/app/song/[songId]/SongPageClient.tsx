'use client'

import { useState, useEffect, useRef } from 'react'
import { GENRE_LABELS, GENRE_COLORS } from '@/lib/constants'
import type { SongRow } from '@/lib/types'

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER NOTE:
// This is the shareable /song/[songId] page. It's separate from the main App
// flow because it needs to be server-rendered for OG tags and SEO.
//
// The full song output UI from the prototype (App.tsx SongScreen component)
// should be ported here. The song prop contains all data needed.
// ─────────────────────────────────────────────────────────────────────────────

export default function SongPageClient({ song }: { song: SongRow }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [capCopied, setCapCopied] = useState(false)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    setTimeout(() => setRevealed(true), 100)
  }, [])

  // Auto-play song when page loads (user must tap play on mobile due to browser policy)
  useEffect(() => {
    if (song.audio_url && audioRef.current) {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay blocked by browser — user needs to tap play
      })
    }
  }, [song.audio_url])

  const gc = GENRE_COLORS[song.genre] || GENRE_COLORS['70s_love_song']
  const gradColors = song.is_brand ? ['#1B2A4A', '#2A3F6F'] : gc.grad
  const accentColor = song.is_brand ? '#1B2A4A' : '#FF6B6B'
  const isChorus = (label: string) =>
    label.toLowerCase().includes('chorus') || label.toLowerCase().includes('outro')

  const genreLabel = GENRE_LABELS[song.genre] || song.genre

  function copyLyrics() {
    const text = [
      song.title,
      '',
      ...(song.sections as { label: string; lines: string[] }[]).flatMap(s => [
        `[${s.label}]`,
        ...s.lines,
        '',
      ]),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const caption = `${song.is_brand
    ? `We had an AI write a theme song for ${song.recipient_name} and it genuinely slaps 🔥🏢`
    : `I had a song written for ${song.recipient_name} and they literally cried 😭🎵`
  } #MakeASong makeasong.com`

  function copyCaption() {
    navigator.clipboard.writeText(caption).then(() => {
      setCapCopied(true)
      setTimeout(() => setCapCopied(false), 2000)
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FFF9F0',
      fontFamily: "'DM Sans', sans-serif",
      padding: '48px 20px 100px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);} }
        .fade-up { animation: fadeUp 0.5s ease forwards; opacity: 0; }
        .act:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
        .pill:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,107,107,0.35); }
      `}</style>

      <div style={{ width: '100%', maxWidth: 660 }}>

        {/* Album cover header */}
        <div
          className={revealed ? 'fade-up' : ''}
          style={{ animationDelay: '0s', marginBottom: 40 }}
        >
          <div style={{
            background: `linear-gradient(135deg, ${gradColors[0]}, ${gradColors[1]})`,
            borderRadius: 28, padding: '48px 36px', textAlign: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {song.is_brand && <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>🏢 Brand Anthem</span>}
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>{genreLabel}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>{song.tone}</span>
            </div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{song.is_brand ? '🏢' : '🎵'}</div>
            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 'clamp(28px, 6vw, 52px)',
              fontWeight: 900, fontStyle: 'italic', color: '#fff',
              lineHeight: 1.1, marginBottom: 14,
              textShadow: '0 2px 20px rgba(0,0,0,0.2)',
            }}>
              {song.title}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {song.is_brand ? `A theme song for ${song.recipient_name}` : `written for ${song.recipient_name}`}
            </p>

            {/* Audio player - show when audio is available */}
            {song.audio_url && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                {!playing && (
                  <button
                    onClick={() => { audioRef.current?.play(); setPlaying(true) }}
                    style={{
                      background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)',
                      borderRadius: 99, padding: '14px 32px', color: '#fff', fontSize: 16,
                      fontWeight: 700, cursor: 'pointer', marginBottom: 14, transition: 'all 0.2s',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    ▶ Play Song
                  </button>
                )}
                <audio
                  ref={audioRef}
                  controls
                  preload="auto"
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    outline: 'none',
                  }}
                  src={`/api/audio/${song.song_id}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Lyrics */}
        <div style={{ background: '#fff', border: '2px solid #EDE8E0', borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}>
          {(song.sections as { label: string; lines: string[] }[]).map((sec, si) => (
            <div
              key={si}
              className={revealed ? 'fade-up' : ''}
              style={{ animationDelay: `${0.15 + si * 0.12}s`, padding: '28px 32px', borderBottom: si < song.sections.length - 1 ? '1px solid #EDE8E0' : 'none' }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9A8F88', marginBottom: 14 }}>
                {sec.label}
              </div>
              {sec.lines.map((line, li) => (
                <div key={li} style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: isChorus(sec.label) ? 'clamp(19px, 3.5vw, 26px)' : 'clamp(16px, 3vw, 22px)',
                  fontWeight: isChorus(sec.label) ? 700 : 400,
                  lineHeight: 1.65,
                  color: isChorus(sec.label) ? accentColor : '#1a1410',
                }}>
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* TikTok / share coach */}
        <div
          className={revealed ? 'fade-up' : ''}
          style={{
            animationDelay: '0.8s',
            background: 'linear-gradient(135deg, rgba(255,217,61,0.3), rgba(255,159,67,0.2))',
            border: '2px solid #FFD93D',
            borderRadius: 20, padding: '20px 24px', marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>📱</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1410', marginBottom: 4 }}>
                {song.is_brand ? 'Share your brand anthem' : 'Film the reaction for TikTok'}
              </div>
              <div style={{ fontSize: 13, color: '#9A8F88', marginBottom: 14, lineHeight: 1.5 }}>
                {song.is_brand
                  ? 'Post this on your socials, use it as a podcast intro, or play it at your next pitch.'
                  : 'Show them the song and hit record. The moment they read their name in the chorus is your video.'}
              </div>
              <div style={{ background: '#fff', border: '1.5px solid #EDE8E0', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#1a1410', lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' }}>
                {caption}
              </div>
              <button
                className="act"
                onClick={copyCaption}
                style={{
                  background: capCopied ? '#6BCB77' : '#fff',
                  color: capCopied ? '#fff' : '#1a1410',
                  border: `1.5px solid ${capCopied ? '#6BCB77' : '#EDE8E0'}`,
                  padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                {capCopied ? '✓ Copied!' : 'Copy Caption'}
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div
          className={revealed ? 'fade-up' : ''}
          style={{ animationDelay: `${0.15 + song.sections.length * 0.12}s` }}
        >
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            {song.audio_url && (
              <a
                href={`/api/audio/${song.song_id}?dl=1`}
                download={`${song.title || 'my-song'}.mp3`}
                className="act"
                style={{
                  display: 'inline-block',
                  background: '#fff', color: '#1a1410',
                  border: '2px solid #EDE8E0', textDecoration: 'none',
                  padding: '12px 22px', borderRadius: 99, fontSize: 14,
                  fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                ⬇ Download MP3
              </a>
            )}
            <button
              className="act"
              onClick={copyLyrics}
              style={{
                background: copied ? '#6BCB77' : '#fff',
                color: copied ? '#fff' : '#1a1410',
                border: `2px solid ${copied ? '#6BCB77' : '#EDE8E0'}`,
                padding: '12px 22px', borderRadius: 99, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copied!' : '📋 Copy Lyrics'}
            </button>
            <a
              href="/"
              className="pill"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #FF6B6B, #FF9F43)',
                color: '#fff', textDecoration: 'none',
                padding: '12px 22px', borderRadius: 99, fontSize: 14,
                fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: '0 4px 14px rgba(255,107,107,0.3)',
              }}
            >
              🎵 Make One for Someone
            </a>
          </div>
          <p style={{ fontSize: 12, color: '#9A8F88', marginBottom: 24 }}>
            This link is shareable. Send it directly to {song.recipient_name}.
          </p>

          {/* ─── SHARE BUTTONS ──────────────────────────────────────────── */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className="act"
              onClick={() => {
                const url = window.location.href
                const text = `Check out this song I had written for ${song.recipient_name}!`
                if (navigator.share) {
                  navigator.share({ title: song.title, text, url }).catch(() => {})
                } else {
                  navigator.clipboard.writeText(url).then(() => alert('Link copied!'))
                }
              }}
              style={{
                background: '#fff', color: '#1a1410',
                border: '2px solid #EDE8E0',
                padding: '10px 18px', borderRadius: 99, fontSize: 13,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              🔗 Share Link
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`I had a personalized song written for ${song.recipient_name} and it's amazing 🎵`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="act"
              style={{
                display: 'inline-block', textDecoration: 'none',
                background: '#fff', color: '#1a1410',
                border: '2px solid #EDE8E0',
                padding: '10px 18px', borderRadius: 99, fontSize: 13,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              &#x1D54F; Post on X
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out this song I had written for ${song.recipient_name}! ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="act"
              style={{
                display: 'inline-block', textDecoration: 'none',
                background: '#fff', color: '#1a1410',
                border: '2px solid #EDE8E0',
                padding: '10px 18px', borderRadius: 99, fontSize: 13,
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
              }}
            >
              💬 WhatsApp
            </a>
          </div>

        </div>

      </div>
    </div>
  )
}
