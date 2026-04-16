'use client'

// ─────────────────────────────────────────────────────────────────────────────
// Make a Song About You — Main App Component
// Ported from make-a-song-about-you.jsx prototype
//
// Steps: landing → occasion → genre → tone → questions (or brand_questions)
//        → review → loading → song
//
// Production flow: ReviewStep calls handleCheckout() → Stripe redirect →
// /checkout/success polls for song → redirects to /song/[songId]
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { phCapture, phIdentify } from './PostHogProvider'
import {
  OCCASIONS, GENRES, PERSONAL_TONES, BRAND_TONES,
  RELATIONSHIPS, BRAND_INDUSTRIES, GENRE_COLORS,
  GENRE_LABELS, SURPRISES, TIKTOK_CAPTIONS,
  PERSONAL_LOAD_LINES, BRAND_LOAD_LINES, PRICE_DISPLAY,
  VOICE_OPTIONS, GENRE_VOICE_DEFAULTS,
} from '@/lib/constants'
import type { Answers, PersonalAnswers, BrandAnswers, SongRow } from '@/lib/types'

// ─── THEME ───────────────────────────────────────────────────────────────────
const G = {
  bg: '#FFF9F0', white: '#FFFFFF', ink: '#1a1410',
  coral: '#FF6B6B', yellow: '#FFD93D', mint: '#6BCB77',
  sky: '#4ECDC4', lavender: '#C77DFF', peach: '#FF9F43',
  pink: '#FF6B9D', muted: '#9A8F88', border: '#EDE8E0',
  navy: '#1B2A4A', navyL: '#2A3F6F',
}

// ─── HOLIDAY COUNTDOWN ───────────────────────────────────────────────────────
const HOLIDAY_DATES: Record<string, () => Date> = {
  valentines: () => {
    const d = new Date(); d.setMonth(1); d.setDate(14)
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
    return d
  },
  mothers_day: () => {
    const d = new Date(); d.setMonth(4); d.setDate(1)
    const day = d.getDay(); d.setDate(1 + (day === 0 ? 7 : 14 - day))
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
    return d
  },
  fathers_day: () => {
    const d = new Date(); d.setMonth(5); d.setDate(1)
    const day = d.getDay(); d.setDate(1 + (day === 0 ? 14 : 21 - day))
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
    return d
  },
}

function useCountdown(occasion: string): number | null {
  const getFn = HOLIDAY_DATES[occasion]
  if (!getFn) return null
  const diff = Math.ceil((getFn().getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 && diff <= 30 ? diff : null
}

// ─── SESSION ID ──────────────────────────────────────────────────────────────
function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('masay_session_id')
  if (!id) {
    id = 'sess_' + Math.random().toString(36).slice(2, 12)
    localStorage.setItem('masay_session_id', id)
  }
  return id
}

// ─── APP ─────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'occasion' | 'genre' | 'tone' | 'questions' | 'brand_questions' | 'review' | 'loading' | 'preview_loading' | 'preview' | 'song'

interface PreviewState {
  preview_id: string
  title: string
  sections: { label: string; lines: string[] }[]
  recipient_name: string
  genre: string
  tone: string
  occasion: string
  is_brand: boolean
  audio_url_preview?: string
  regen_count: number
  max_regens: number
  regens_remaining: number
}

// ─── iOS NATIVE APP DETECTION ──────────────────────────────────────────────
function isIOSApp(): boolean {
  return typeof window !== 'undefined' && !!(window as any).MASAYiOS?.isNativeApp
}

export default function App() {
  const [step, setStep]                       = useState<Step>('landing')
  const [answers, setAnswers]                 = useState<Record<string, string>>({})
  const [song, setSong]                       = useState<{ title: string; sections: { label: string; lines: string[] }[]; audioUrl?: string; songId?: string } | null>(null)
  const [loadLine, setLoadLine]               = useState(0)
  const [regenCount, setRegenCount]           = useState(0)
  const [copied, setCopied]                   = useState(false)
  const [revealed, setRevealed]               = useState(false)
  const [tiktokMode, setTiktokMode]           = useState(false)
  const [sendMode, setSendMode]               = useState(false)
  const [email, setEmail]                     = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [preview, setPreview]                 = useState<PreviewState | null>(null)
  const [previewError, setPreviewError]       = useState<string>('')
  const [regenLoading, setRegenLoading]       = useState(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  const isBrand = answers.occasion === 'brand'
  const loadLines = isBrand ? BRAND_LOAD_LINES : PERSONAL_LOAD_LINES

  useEffect(() => {
    if (step === 'loading') {
      setLoadLine(0)
      timer.current = setInterval(() => setLoadLine(l => (l + 1) % loadLines.length), 1800)
    }
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [step, loadLines.length])

  useEffect(() => {
    if (step === 'song') { setRevealed(false); setTimeout(() => setRevealed(true), 80) }
  }, [step, song])

  // M3: fire funnel events when the user crosses key step boundaries. These
  // were declared in @/lib/posthog but never fired from the client.
  useEffect(() => {
    if (step === 'landing') phCapture('landing_viewed')
    if (step === 'occasion') phCapture('quiz_started')
    if (step === 'review') phCapture('quiz_completed', { is_brand: isBrand })
    if (step === 'song') phCapture('song_viewed', { song_id: song?.songId })
  }, [step, isBrand, song?.songId])

  // Restore saved answers + jump to review when returning from a cancelled Stripe checkout
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('cancelled') === 'true') {
      const saved = localStorage.getItem('masay_answers')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          setAnswers(parsed)
          setStep('review')
        } catch {}
      }
      // Clean the URL so refresh doesn't re-trigger this
      window.history.replaceState({}, '', '/')
    }
  }, [])

  // Scroll to top on every step change so primary CTAs are always in view
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'auto' })
  }, [step])

  const set = (k: string, v: string) => setAnswers(a => ({ ...a, [k]: v }))
  function applySurprise(s: { genre: string; tone: string }) {
    setAnswers(a => ({ ...a, genre: s.genre, tone: s.tone }))
  }

  // ─── PREVIEW GENERATION ────────────────────────────────────────────────────
  // New flow: generate a full preview (lyrics + 20s audio) BEFORE we send the
  // buyer to Stripe. They can regenerate up to 3 extra times and only pay if
  // they're happy with what they hear. Lyria mispronounces words often enough
  // that this dramatically cuts refund requests.
  async function handleGeneratePreview() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('Please enter a valid email so we can send you the song.')
      return
    }
    setCheckoutLoading(true)
    setPreviewError('')
    const sessionId = getOrCreateSessionId()
    localStorage.setItem('masay_answers', JSON.stringify(answers))
    localStorage.setItem('masay_email', email)

    phIdentify(sessionId, { email })
    phCapture('preview_email_submitted', { email_domain: email.split('@')[1] })
    phCapture('preview_generation_started', { occasion: answers.occasion, genre: answers.genre })

    setStep('preview_loading')

    try {
      const res = await fetch('/api/preview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, email, answers }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setPreviewError(data.error || 'Preview failed. Please try again.')
        setStep('review')
        setCheckoutLoading(false)
        phCapture('preview_generation_failed', { error: data.error })
        return
      }
      setPreview(data.preview)
      localStorage.setItem('masay_preview_id', data.preview.preview_id)
      setStep('preview')
      phCapture('preview_generated', { preview_id: data.preview.preview_id })
    } catch (err) {
      setPreviewError('Network error. Please try again.')
      setStep('review')
      phCapture('preview_generation_failed', { error: 'network' })
    } finally {
      setCheckoutLoading(false)
    }
  }

  // ─── PREVIEW REGENERATION ─────────────────────────────────────────────────
  async function handleRegenPreview() {
    if (!preview) return
    if (preview.regens_remaining <= 0) {
      alert('No regenerations remaining. Buy the full song to keep this one, or start fresh.')
      return
    }
    setRegenLoading(true)
    try {
      const res = await fetch('/api/preview/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: preview.preview_id,
          sessionId: getOrCreateSessionId(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        alert(data.error || 'Regenerate failed. Please try again.')
        return
      }
      setPreview(data.preview)
      phCapture('preview_regenerated', { preview_id: preview.preview_id, attempt: data.preview.regen_count })
    } catch {
      alert('Network error. Please try again.')
    } finally {
      setRegenLoading(false)
    }
  }

  // ─── CHECKOUT FROM PREVIEW ────────────────────────────────────────────────
  async function handleCheckout() {
    if (!preview) return
    setCheckoutLoading(true)
    phCapture('checkout_started', { preview_id: preview.preview_id })

    // ── iOS In-App Purchase path ──
    if (isIOSApp()) {
      try {
        const bridge = (window as any).MASAYiOS
        ;(window as any).__masayPurchaseCallback = async (result: { success: boolean; transactionId?: string; receiptData?: string; error?: string }) => {
          if (!result.success) {
            alert(result.error || 'Purchase was cancelled.')
            setCheckoutLoading(false)
            return
          }
          // Verify with our server and generate the song
          try {
            setStep('loading')
            const res = await fetch('/api/verify-apple-purchase', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                transactionId: result.transactionId,
                receiptData: result.receiptData,
                sessionId: getOrCreateSessionId(),
                email,
                answers,
              }),
            })
            const data = await res.json()
            if (data.error) {
              alert('Song generation failed: ' + data.error)
              setStep('preview')
              setCheckoutLoading(false)
              return
            }
            setSong({
              title: data.song.title,
              sections: data.song.sections,
              audioUrl: data.song.audio_url,
              songId: data.songId,
            })
            setStep('result')
          } catch {
            alert('Something went wrong generating your song.')
            setStep('preview')
          } finally {
            setCheckoutLoading(false)
          }
        }
        bridge.requestPurchase('com.makeasongaboutyou.song')
      } catch {
        alert('Something went wrong with the purchase.')
        setCheckoutLoading(false)
      }
      return
    }

    // ── Web Stripe path ──
    try {
      const res = await fetch('/api/preview/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          previewId: preview.preview_id,
          sessionId: getOrCreateSessionId(),
        }),
      })
      const { url, error } = await res.json()
      if (error || !url) {
        alert('Something went wrong starting checkout. Please try again.')
        setCheckoutLoading(false)
        return
      }
      window.location.href = url
    } catch {
      alert('Something went wrong. Please try again.')
      setCheckoutLoading(false)
    }
  }

  // ─── TEST MODE (skip payment) ──────────────────────────────────────────────
  async function handleTestGenerate() {
    setCheckoutLoading(true)
    setStep('loading')
    try {
      const res = await fetch('/api/test-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          genre: answers.genre || 'pop-anthem',
          tone: isBrand ? answers.brand_tone : answers.tone,
          occasion: answers.occasion,
          isBrand,
          email: email || 'test@test.com',
          brandTone: isBrand ? answers.brand_tone : undefined,
        }),
      })
      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch (parseErr) {
        throw new Error('Server returned an invalid response. Please try again.')
      }
      if (data.success && data.song) {
        setSong({
          title: data.song.title,
          sections: data.song.sections,
          audioUrl: data.song.audio_url,
          songId: data.song.song_id || data.songId,
        })
        setStep('song')
      } else {
        alert('Generation failed: ' + (data.error || 'Unknown error'))
        setStep('review')
      }
    } catch (err) {
      alert('Something went wrong: ' + err)
      setStep('review')
    }
    setCheckoutLoading(false)
  }

  // ─── COPY LYRICS ──────────────────────────────────────────────────────────
  function copyLyrics() {
    if (!song) return
    const text = [
      song.title, '',
      ...song.sections.flatMap(s => [`[${s.label}]`, ...s.lines, '']),
    ].join('\n')
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const restart = () => {
    setAnswers({}); setSong(null); setRegenCount(0)
    setTiktokMode(false); setSendMode(false); setStep('landing')
    localStorage.removeItem('masay_answers')
  }

  function afterOccasion() { setStep('genre') }
  function afterGenre() { setStep('tone') }
  function afterTone() { setStep(isBrand ? 'brand_questions' : 'questions') }

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${G.bg};}
        @keyframes spin    {to{transform:rotate(360deg);}}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
        @keyframes bounce  {0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
        @keyframes pulse   {0%,100%{opacity:1;}50%{opacity:0.45;}}
        @keyframes lyricIn {from{opacity:0;transform:translateY(24px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes popIn   {0%{transform:scale(0.8);opacity:0;}60%{transform:scale(1.06);}100%{transform:scale(1);opacity:1;}}
        .fade-up{animation:fadeUp 0.5s ease forwards;opacity:0;}
        .bounce{animation:bounce 1.2s ease infinite;}
        input:focus,textarea:focus,select:focus{outline:none;}
        input::placeholder,textarea::placeholder{color:${G.muted};}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:${G.border};border-radius:3px;}
        .pill:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(255,107,107,0.35);}
        .pill:disabled{opacity:0.4;cursor:not-allowed;transform:none;box-shadow:none;}
        .card:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.09);}
        .card.sel{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,0.09);}
        .ghost:hover{background:${G.border};}
        .act:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,0.1);}
      `}</style>

      <div style={{ minHeight: '100vh', background: G.bg, fontFamily: "'DM Sans',sans-serif", color: G.ink }}>
        {step === 'landing'         && <Landing onStart={() => setStep('occasion')} answers={answers} set={set} applySurprise={applySurprise} />}
        {step === 'occasion'        && <OccasionStep answers={answers} set={set} onNext={afterOccasion} />}
        {step === 'genre'           && <GenreStep answers={answers} set={set} onBack={() => setStep('occasion')} onNext={afterGenre} />}
        {step === 'tone'            && <ToneStep answers={answers} set={set} onBack={() => setStep('genre')} onNext={afterTone} isBrand={isBrand} />}
        {step === 'questions'       && <QuestionsStep answers={answers} set={set} onBack={() => setStep('tone')} onNext={() => setStep('review')} />}
        {step === 'brand_questions' && <BrandQuestionsStep answers={answers} set={set} onBack={() => setStep('tone')} onNext={() => setStep('review')} />}
        {step === 'review'          && <ReviewStep answers={answers} email={email} setEmail={setEmail} onBack={() => setStep(isBrand ? 'brand_questions' : 'questions')} onGenerate={handleGeneratePreview} onTestGenerate={handleTestGenerate} isBrand={isBrand} loading={checkoutLoading} previewError={previewError} />}
        {step === 'loading'         && <LoadingScreen loadLine={loadLine} isBrand={isBrand} />}
        {step === 'preview_loading' && <PreviewLoadingScreen isBrand={isBrand} />}
        {step === 'preview' && preview && (
          <PreviewStep
            preview={preview}
            isBrand={isBrand}
            regenLoading={regenLoading}
            checkoutLoading={checkoutLoading}
            onRegen={handleRegenPreview}
            onCheckout={handleCheckout}
            onBack={() => setStep('review')}
          />
        )}
        {step === 'song' && song && !tiktokMode && !sendMode && (
          <SongScreen song={song} answers={answers} revealed={revealed} regenCount={regenCount} copied={copied}
            onRegen={async () => { if (regenCount < 1) { setRegenCount(c => c + 1) } }}
            onCopy={copyLyrics} onNew={restart} onTikTok={() => setTiktokMode(true)} onSend={() => setSendMode(true)}
            isBrand={isBrand} audioUrl={song.audioUrl} songId={song.songId}
          />
        )}
        {step === 'song' && song && tiktokMode && <TikTokVideoMode song={song} answers={answers} onBack={() => setTiktokMode(false)} songId={song.songId} audioUrl={song.audioUrl} />}
        {step === 'song' && song && sendMode && <SendSongModal song={song} answers={answers} onBack={() => setSendMode(false)} isBrand={isBrand} />}
      </div>
    </>
  )
}

// ─── SHELL ────────────────────────────────────────────────────────────────────
function Shell({ step, total, children }: { step: number; total: number; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px 80px' }}>
      <div style={{ width: '100%', maxWidth: 680, marginBottom: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: G.muted }}>Step {step} of {total}</span>
          <span style={{ fontSize: 13, color: G.muted }}>{Math.round((step / total) * 100)}%</span>
        </div>
        <div style={{ height: 7, background: G.border, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(step / total) * 100}%`, background: `linear-gradient(90deg,${G.coral},${G.peach})`, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: 680 }}>{children}</div>
    </div>
  )
}

function StepTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      {eyebrow && <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: G.coral, marginBottom: 8 }}>{eyebrow}</div>}
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(26px,5vw,40px)', fontWeight: 700, lineHeight: 1.15 }}>{title}</h2>
    </div>
  )
}

function NavRow({ onBack, onNext, label = 'Continue →', disabled }: { onBack: () => void; onNext: () => void; label?: string; disabled?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 36 }}>
      <button className="ghost" onClick={onBack} style={{ background: 'transparent', border: `2px solid ${G.border}`, color: G.muted, padding: '12px 24px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>← Back</button>
      <button className="pill" onClick={onNext} disabled={disabled}
        style={{ background: disabled ? G.border : `linear-gradient(135deg,${G.coral},${G.peach})`, color: disabled ? G.muted : '#fff', border: 'none', padding: '14px 32px', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: disabled ? 'none' : '0 4px 16px rgba(255,107,107,0.35)' }}>
        {label}
      </button>
    </div>
  )
}

// ─── LANDING ──────────────────────────────────────────────────────────────────
function Landing({ onStart, answers, set, applySurprise }: { onStart: () => void; answers: Record<string, string>; set: (k: string, v: string) => void; applySurprise: (s: { genre: string; tone: string }) => void }) {
  const [pickedSurprise, setPickedSurprise] = useState<(typeof SURPRISES)[number] | null>(null)

  function doSurprise() {
    const s = SURPRISES[Math.floor(Math.random() * SURPRISES.length)]
    setPickedSurprise(s); applySurprise(s)
  }

  const valentinesCountdown = useCountdown('valentines')
  const mothersCountdown = useCountdown('mothers_day')
  const fathersCountdown = useCountdown('fathers_day')
  const countdown = valentinesCountdown ? { days: valentinesCountdown, label: "Valentine's Day" }
    : mothersCountdown ? { days: mothersCountdown, label: "Mother's Day" }
    : fathersCountdown ? { days: fathersCountdown, label: "Father's Day" } : null

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      {[
        { top: -80, right: -80, size: 320, color: `${G.yellow}50` },
        { bottom: -100, left: -100, size: 380, color: `${G.coral}28` },
        { top: '38%', left: -60, size: 220, color: `${G.mint}40` },
        { top: '20%', right: -40, size: 180, color: `${G.lavender}35` },
      ].map((b: any, i) => (
        <div key={i} style={{ position: 'absolute', top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.size, height: b.size, borderRadius: '50%', background: `radial-gradient(circle,${b.color},transparent 70%)`, pointerEvents: 'none' }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 620 }}>
        {countdown && (
          <div style={{ background: `linear-gradient(135deg,${G.coral},${G.peach})`, color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 22px', borderRadius: 99, marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 8, animation: 'popIn 0.5s ease' }}>
            ⏰ {countdown.label} is in {countdown.days} day{countdown.days !== 1 ? 's' : ''}
          </div>
        )}

        <div className="bounce" style={{ fontSize: 60, marginBottom: 16 }}>🎵</div>
        <div style={{ display: 'inline-block', background: `${G.coral}18`, color: G.coral, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 18px', borderRadius: 99, marginBottom: 24, border: `1.5px solid ${G.coral}30` }}>The gift that hits different</div>

        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(44px,10vw,86px)', fontWeight: 900, lineHeight: 0.98, color: G.ink, marginBottom: 20 }}>
          Make a Song<br /><span style={{ fontStyle: 'italic', color: G.coral }}>About You</span>
        </h1>
        <p style={{ fontSize: 18, color: G.muted, lineHeight: 1.65, maxWidth: 440, margin: '0 auto 44px', fontWeight: 400 }}>
          A one-of-a-kind song about someone you love — written in minutes, remembered forever.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
          <button className="pill" onClick={onStart} style={{ background: `linear-gradient(135deg,${G.coral},${G.peach})`, color: '#fff', border: 'none', padding: '18px 48px', borderRadius: 99, fontSize: 17, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 8px 28px rgba(255,107,107,0.4)' }}>
            Make a Song ✦
          </button>
          <button className="pill" onClick={doSurprise} style={{ background: G.white, color: G.ink, border: `2px solid ${G.border}`, padding: '18px 28px', borderRadius: 99, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}>
            🎲 Surprise Me
          </button>
        </div>

        {pickedSurprise && (
          <div style={{ animation: 'popIn 0.4s ease', background: G.white, border: `2px solid ${G.border}`, borderRadius: 16, padding: '14px 20px', marginBottom: 20, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>{pickedSurprise.emoji}</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.ink }}>{pickedSurprise.label}</div>
              <div style={{ fontSize: 12, color: G.muted }}>{GENRE_LABELS[pickedSurprise.genre]} · {pickedSurprise.tone}</div>
            </div>
            <button className="pill" onClick={onStart} style={{ background: `linear-gradient(135deg,${G.coral},${G.peach})`, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginLeft: 8 }}>Let&apos;s go →</button>
          </div>
        )}

        {/* Risk-reversal: surface the free preview promise right at the decision point.
            Most common objection is "what if I pay and it's bad?" — this kills that objection. */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: `${G.mint}1f`, border: `1.5px solid ${G.mint}`, color: G.ink, fontSize: 14, fontWeight: 600, padding: '10px 18px', borderRadius: 99, marginBottom: 14 }}>
          <span aria-hidden="true" style={{ fontSize: 16 }}>🎧</span>
          Hear a free 30-second preview before you pay
        </div>

        <p style={{ fontSize: 13, color: G.muted, marginBottom: 56 }}>Takes 3 minutes · No account needed · Only pay if you love it</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, textAlign: 'left' }}>
          {[
            { title: '"The Man Who Remembers Everything"', excerpt: '"Marcus, you remember every little thing I said / Six months later, there it is, sitting on the bed…"', tag: 'Anniversary · 70s Soul' },
            { title: '"Built Different (Vera\'s Bakery)"', excerpt: '"Flour on the counter, love in the dough / Vera\'s Bakery, everyone knows / Where every morning starts with something real…"', tag: 'Brand Anthem · Country' },
          ].map((s, i) => (
            <div key={i} style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 18, padding: '20px 18px' }}>
              <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: G.coral, background: `${G.coral}14`, padding: '3px 10px', borderRadius: 99, marginBottom: 10 }}>{s.tag}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 15, fontWeight: 700, fontStyle: 'italic', color: G.ink, marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.6, fontStyle: 'italic' }}>{s.excerpt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ——— HOW IT WORKS ——————————————————————————————————————————————————— */}
      <div style={{ width: '100%', maxWidth: 720, margin: '0 auto', padding: '80px 20px 0' }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(28px,5vw,40px)', fontWeight: 700, textAlign: 'center', marginBottom: 48, color: G.ink }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 24 }}>
          {[
            { num: '1', icon: '🎯', title: 'Pick the vibe', desc: 'Choose an occasion, genre, and tone that fits. Birthday roast? Anniversary ballad? Brand anthem? We got you.' },
            { num: '2', icon: '💬', title: 'Tell us about them', desc: 'Answer a few quick questions — their name, what makes them special, a favorite memory. The more detail, the better the song.' },
            { num: '3', icon: '🎧', title: 'Preview it free', desc: 'Hear a 30-second preview with your real lyrics and audio before you pay a dime. Love it? Unlock the full song. Not feeling it? No charge.' },
          ].map((s) => (
            <div key={s.num} style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div aria-hidden="true" style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg,${G.coral}20,${G.peach}20)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: G.ink }}>{s.title}</div>
              <div style={{ fontSize: 14, color: G.muted, lineHeight: 1.6 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ——— PRICING ———————————————————————————————————————————————————————— */}
      <div style={{ width: '100%', maxWidth: 480, margin: '0 auto', padding: '80px 20px 0', textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(28px,5vw,40px)', fontWeight: 700, marginBottom: 16, color: G.ink }}>
          Simple Pricing
        </h2>
        <p style={{ fontSize: 15, color: G.muted, marginBottom: 32, lineHeight: 1.6 }}>One song, one price. No subscriptions, no hidden fees.</p>
        <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 24, padding: '36px 28px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${G.coral},${G.peach})` }} />
          <div style={{ fontSize: 48, fontFamily: "'Fraunces',serif", fontWeight: 900, color: G.ink, marginBottom: 8 }}>{PRICE_DISPLAY}</div>
          <div style={{ fontSize: 14, color: G.muted, marginBottom: 24 }}>per song · one-time payment</div>
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Free 30-second preview before you pay — only buy if you love it',
              'Original lyrics written by AI, personalized to your answers',
              'Choose from 6 genres and 4 tones',
              'Shareable song page with a unique link',
              'Delivered via email so you never lose it',
              'Works for personal gifts or brand anthems',
              isIOSApp() ? 'Secure payment via Apple' : 'Secure checkout via Stripe (Apple Pay + Google Pay)',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: G.ink, lineHeight: 1.5 }}>
                <span style={{ color: G.mint, fontSize: 16, flexShrink: 0, marginTop: 1 }}>&#10003;</span>
                {item}
              </div>
            ))}
          </div>
          <button className="pill" onClick={onStart} style={{ marginTop: 28, width: '100%', background: `linear-gradient(135deg,${G.coral},${G.peach})`, color: '#fff', border: 'none', padding: '16px', borderRadius: 99, fontSize: 16, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 6px 24px rgba(255,107,107,0.35)' }}>
            Make a Song —¦
          </button>
        </div>
      </div>

      {/* ——— FAQ ————————————————————————————————————————————————————————————— */}
      <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', padding: '80px 20px 0' }}>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(28px,5vw,40px)', fontWeight: 700, textAlign: 'center', marginBottom: 40, color: G.ink }}>
          Questions?
        </h2>
        {[
          { q: 'Do I have to pay before I hear it?', a: 'Nope. After you answer the questions we generate a free 30-second preview — real lyrics, real audio, made from your answers. You only pay if you love it.' },
          { q: 'How long does it take?', a: 'Under 60 seconds once you submit. You answer a few fun questions (about 3 minutes), hear your free preview, and if you love it, unlock the full song instantly.' },
          { q: 'Can I hear the song or is it just lyrics?', a: 'You get original written lyrics, plus AI-generated audio you can play and share. The 30-second preview is free — the full song unlocks after purchase.' },
          { q: 'What if I don\'t like the song?', a: 'Every song is uniquely generated from your answers. The more detail you give, the better the result. We also offer one free regeneration per song.' },
          { q: 'Is this a subscription?', a: `No. It's a one-time payment of ${PRICE_DISPLAY}. No recurring charges, no account needed.` },
          { q: 'Can I use this for a business or brand?', a: 'Absolutely. We have a dedicated Brand Mode with custom questions for businesses, podcasts, startups, and more.' },
          { q: 'How do I share the song?', a: 'Every song gets its own unique link you can text, email, or post on social media. We also provide TikTok-ready captions.' },
        ].map((faq, i) => (
          <details key={i} style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 10, cursor: 'pointer' }}>
            <summary style={{ fontWeight: 700, fontSize: 15, color: G.ink, listStyle: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {faq.q}
              <span style={{ color: G.muted, fontSize: 18, flexShrink: 0, marginLeft: 12 }}>+</span>
            </summary>
            <p style={{ fontSize: 14, color: G.muted, lineHeight: 1.65, marginTop: 12 }}>{faq.a}</p>
          </details>
        ))}
      </div>

      {/* ——— FOOTER —————————————————————————————————————————————————————————— */}
      <footer style={{ width: '100%', textAlign: 'center', padding: '80px 20px 40px', fontSize: 13, color: G.muted }}>
        <div style={{ marginBottom: 12 }}>
          <a href="/privacy" style={{ color: G.muted, textDecoration: 'underline', marginRight: 20 }}>Privacy Policy</a>
          <a href="/terms" style={{ color: G.muted, textDecoration: 'underline' }}>Terms of Service</a>
        </div>
        <div>&copy; {new Date().getFullYear()} Make a Song About You. All rights reserved.</div>
      </footer>
    </div>
  )
}

// ─── OCCASION ─────────────────────────────────────────────────────────────────
function OccasionStep({ answers, set, onNext }: { answers: Record<string, string>; set: (k: string, v: string) => void; onNext: () => void }) {
  return (
    <Shell step={1} total={5}>
      <StepTitle eyebrow="Step 1 of 5" title="What's this song for? 🎉" />

      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: G.muted, marginBottom: 12 }}>Personal</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {OCCASIONS.filter(o => !('isBrand' in o && o.isBrand)).map(o => {
          const sel = answers.occasion === o.id
          return (
            <button key={o.id} className={`card${sel ? ' sel' : ''}`}
              onClick={() => { set('occasion', o.id); setTimeout(onNext, 200) }}
              style={{ background: sel ? G.coral : G.white, color: sel ? '#fff' : G.ink, border: `2px solid ${sel ? G.coral : G.border}`, borderRadius: 16, padding: '18px 10px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 28 }}>{o.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>{o.label}</span>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: G.border }} />
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: G.muted }}>Business</span>
        <div style={{ flex: 1, height: 1, background: G.border }} />
      </div>

      {(() => {
        const o = OCCASIONS.find(x => 'isBrand' in x && x.isBrand)!
        const sel = answers.occasion === o.id
        return (
          <button className={`card${sel ? ' sel' : ''}`}
            onClick={() => { set('occasion', o.id); setTimeout(onNext, 200) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 16,
              background: sel ? `linear-gradient(135deg,${G.navy},${G.navyL})` : G.white,
              color: sel ? '#fff' : G.ink,
              border: `2px solid ${sel ? G.navy : G.border}`,
              borderRadius: 16, padding: '20px 24px', cursor: 'pointer', transition: 'all 0.2s',
              textAlign: 'left',
            }}>
            <span style={{ fontSize: 36, flexShrink: 0 }}>{o.emoji}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{o.label}</div>
              <div style={{ fontSize: 13, color: sel ? 'rgba(255,255,255,0.7)' : G.muted, lineHeight: 1.4 }}>
                Theme songs, jingles &amp; brand anthems for businesses, startups, podcasts, and more
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 20, opacity: 0.6 }}>→</div>
          </button>
        )
      })()}
    </Shell>
  )
}

// ─── GENRE ────────────────────────────────────────────────────────────────────
function GenreStep({ answers, set, onBack, onNext }: { answers: Record<string, string>; set: (k: string, v: string) => void; onBack: () => void; onNext: () => void }) {
  const isBrand = answers.occasion === 'brand'

  // Picking a genre auto-defaults the voice (if none chosen yet) so the user
  // never has to hunt for the picker — Continue activates the moment they tap a
  // card. Re-tapping the same card preserves their voice override.
  const pickGenre = (gid: string) => {
    set('genre', gid)
    if (!answers.voice || answers.genre !== gid) {
      const def = GENRE_VOICE_DEFAULTS[gid] || 'either'
      // Only set when no override exists OR user is switching genres entirely.
      if (!answers.voice || answers.genre !== gid) set('voice', def)
    }
  }

  return (
    <Shell step={2} total={5}>
      <StepTitle eyebrow="Step 2 of 5" title="Pick your sound 🎸" />
      {isBrand && (
        <div style={{ background: `${G.navy}12`, border: `1.5px solid ${G.navy}30`, borderRadius: 14, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: G.navy, fontWeight: 500 }}>
          🏢 Brand mode — choose the musical style for your theme song
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 14 }}>
        {GENRES.map(g => {
          const sel = answers.genre === g.id
          const c = GENRE_COLORS[g.id]
          return (
            <div key={g.id} className={`card${sel ? ' sel' : ''}`}
              onClick={() => { if (!sel) pickGenre(g.id) }}
              style={{ background: sel ? c.bg : G.white, border: `2px solid ${sel ? c.accent : G.border}`, borderRadius: 20, padding: '22px 20px', cursor: sel ? 'default' : 'pointer', transition: 'all 0.2s', position: 'relative' }}>
              {sel && <div style={{ position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: '50%', background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span></div>}
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{g.label}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: c.accent, marginBottom: 12 }}>{g.tagline}</div>
              <div style={{ fontSize: 13, color: G.muted, lineHeight: 1.55, marginBottom: 14 }}>{g.desc}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 14, fontStyle: 'italic', color: G.ink, borderLeft: `3px solid ${c.accent}`, paddingLeft: 12, lineHeight: 1.5 }}>{g.sample}</div>

              {sel && (
                <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px dashed ${c.accent}55` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: G.muted, marginBottom: 10 }}>
                    Lead vocal
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {VOICE_OPTIONS.map(v => {
                      const vSel = (answers.voice || GENRE_VOICE_DEFAULTS[g.id] || 'either') === v.id
                      return (
                        <button key={v.id} type="button"
                          onClick={(e) => { e.stopPropagation(); set('voice', v.id) }}
                          style={{
                            padding: '9px 0',
                            borderRadius: 99,
                            border: `1.5px solid ${vSel ? c.accent : G.border}`,
                            background: vSel ? c.accent : G.white,
                            color: vSel ? '#fff' : G.muted,
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}>
                          {v.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <NavRow onBack={onBack} onNext={onNext} disabled={!answers.genre || !answers.voice} />
    </Shell>
  )
}

// ─── TONE ─────────────────────────────────────────────────────────────────────
function ToneStep({ answers, set, onBack, onNext, isBrand }: { answers: Record<string, string>; set: (k: string, v: string) => void; onBack: () => void; onNext: () => void; isBrand: boolean }) {
  const tones = isBrand ? BRAND_TONES : PERSONAL_TONES
  const toneKey = isBrand ? 'brand_tone' : 'tone'
  const hasSelection = !!answers[toneKey]

  return (
    <Shell step={3} total={5}>
      <StepTitle eyebrow="Step 3 of 5" title={isBrand ? "What's the brand energy? 💼" : "What's the vibe? 🎭"} />
      {isBrand && (
        <div style={{ background: `${G.navy}12`, border: `1.5px solid ${G.navy}30`, borderRadius: 14, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: G.navy, fontWeight: 500 }}>
          🏢 How should this brand song feel to listeners?
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {tones.map(t => {
          const sel = answers[toneKey] === t.id
          return (
            <div key={t.id} className={`card${sel ? ' sel' : ''}`}
              onClick={() => set(toneKey, t.id)}
              style={{ background: sel ? `${t.color}18` : G.white, border: `2px solid ${sel ? t.color : G.border}`, borderRadius: 20, padding: '26px 20px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{t.emoji}</div>
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: 19, fontWeight: 700, color: sel ? t.color : G.ink, marginBottom: 6 }}>{t.label}</div>
              <div style={{ fontSize: 13, color: G.muted }}>{t.desc}</div>
            </div>
          )
        })}
      </div>
      <NavRow onBack={onBack} onNext={onNext} disabled={!hasSelection} />
    </Shell>
  )
}

// ─── PERSONAL QUESTIONS ───────────────────────────────────────────────────────
function QuestionsStep({ answers, set, onBack, onNext }: { answers: Record<string, string>; set: (k: string, v: string) => void; onBack: () => void; onNext: () => void }) {
  const req = ['recipient_name', 'relationship', 'word1', 'word2', 'word3', 'what_makes_special']
  const can = req.every(k => answers[k]?.trim())
  return (
    <Shell step={4} total={5}>
      <StepTitle eyebrow="Step 4 of 5" title="Tell us about them 💛" />
      <Crd><Lbl req>Who is this song for?</Lbl><Inp placeholder="Their name or nickname" value={answers.recipient_name || ''} onChange={e => set('recipient_name', e.target.value)} /></Crd>
      <Crd><Lbl>And who&apos;s writing it?</Lbl><Inp placeholder="Your name (optional)" value={answers.sender_name || ''} onChange={e => set('sender_name', e.target.value)} /></Crd>
      <Crd>
        <Lbl req>Your relationship to them</Lbl>
        <Sel value={answers.relationship || ''} onChange={e => set('relationship', e.target.value)}>
          <option value="">Select one…</option>
          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
        </Sel>
      </Crd>
      <Crd>
        <Lbl req>Three words that describe them</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {['word1', 'word2', 'word3'].map((k, i) => <Inp key={k} placeholder={['First', 'Second', 'Third'][i]} value={answers[k] || ''} onChange={e => set(k, e.target.value)} />)}
        </div>
      </Crd>
      <Crd>
        <Lbl req>What makes them truly special?</Lbl>
        <Txta maxLength={300} placeholder="The thing about them no one else has…" value={answers.what_makes_special || ''} onChange={e => set('what_makes_special', e.target.value)} />
        <div style={{ textAlign: 'right', fontSize: 12, color: G.muted, marginTop: 6 }}>{(answers.what_makes_special || '').length}/300</div>
      </Crd>
      <Crd><Lbl>A favorite memory together</Lbl><Txta placeholder='e.g. "That rainy trip where everything went wrong and we laughed the whole time."' value={answers.favorite_memory || ''} onChange={e => set('favorite_memory', e.target.value)} maxLength={200} /></Crd>
      <Crd><Lbl>Something funny or endearing about them</Lbl><Txta placeholder='e.g. "They think they can parallel park but it takes 11 attempts every time."' value={answers.something_funny || ''} onChange={e => set('something_funny', e.target.value)} maxLength={200} style={{ minHeight: 80 }} /></Crd>
      <Crd><Lbl>Their catchphrase or go-to saying</Lbl><Inp placeholder='"It is what it is." or "Everything happens for a reason."' value={answers.catchphrase || ''} onChange={e => set('catchphrase', e.target.value)} /></Crd>
      <Crd><Lbl>Their hobby or biggest passion</Lbl><Inp placeholder="Watches every F1 race, obsessed with sourdough, runs marathons…" value={answers.hobby || ''} onChange={e => set('hobby', e.target.value)} /></Crd>
      <Crd><Lbl>Their city or a meaningful place</Lbl><Inp placeholder='Detroit / "that little cabin in Vermont"' value={answers.city || ''} onChange={e => set('city', e.target.value)} /></Crd>
      <NavRow onBack={onBack} onNext={onNext} disabled={!can} label="Review My Song →" />
    </Shell>
  )
}

// ─── BRAND QUESTIONS ─────────────────────────────────────────────────────────
function BrandQuestionsStep({ answers, set, onBack, onNext }: { answers: Record<string, string>; set: (k: string, v: string) => void; onBack: () => void; onNext: () => void }) {
  const req = ['brand_name', 'brand_industry', 'brand_what']
  const can = req.every(k => answers[k]?.trim())

  return (
    <Shell step={4} total={5}>
      <StepTitle eyebrow="Step 4 of 5 · Brand Mode" title="Tell us about your brand 🏢" />

      <div style={{ background: `linear-gradient(135deg,${G.navy},${G.navyL})`, borderRadius: 18, padding: '18px 20px', marginBottom: 20, color: '#fff' }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>You&apos;re creating a brand theme song</div>
        <div style={{ fontSize: 12, opacity: 0.75, lineHeight: 1.5 }}>Great for intros, ads, social media, store ambiance, or just making your brand feel alive. The more detail you give, the more specific and powerful the song.</div>
      </div>

      <Crd>
        <Lbl req>Brand or business name</Lbl>
        <Inp placeholder="e.g. Vera's Bakery, NovaPay, The Grind Podcast" value={answers.brand_name || ''} onChange={e => set('brand_name', e.target.value)} />
      </Crd>

      <Crd>
        <Lbl req>Industry / type of business</Lbl>
        <Sel value={answers.brand_industry || ''} onChange={e => set('brand_industry', e.target.value)}>
          <option value="">Select one…</option>
          {BRAND_INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </Sel>
      </Crd>

      <Crd>
        <Lbl req>What do they do? (1–2 sentences)</Lbl>
        <Txta maxLength={250} placeholder='e.g. "We make small-batch hot sauces inspired by Caribbean flavors and ship nationwide."' value={answers.brand_what || ''} onChange={e => set('brand_what', e.target.value)} style={{ minHeight: 80 }} />
        <div style={{ textAlign: 'right', fontSize: 12, color: G.muted, marginTop: 6 }}>{(answers.brand_what || '').length}/250</div>
      </Crd>

      <Crd>
        <Lbl>Tagline or slogan</Lbl>
        <Inp placeholder='e.g. "Built with fire. Made with love." (optional)' value={answers.brand_tagline || ''} onChange={e => set('brand_tagline', e.target.value)} />
      </Crd>

      <Crd>
        <Lbl>Who is their target audience?</Lbl>
        <Inp placeholder='e.g. "Young professionals who want healthy fast food options"' value={answers.brand_audience || ''} onChange={e => set('brand_audience', e.target.value)} />
      </Crd>

      <Crd>
        <Lbl>Brand personality in their own words</Lbl>
        <Inp placeholder='e.g. "We&#39;re bold, a little chaotic, and unapologetically ourselves"' value={answers.brand_vibe || ''} onChange={e => set('brand_vibe', e.target.value)} />
      </Crd>

      <Crd>
        <Lbl>What makes them different from competitors?</Lbl>
        <Txta maxLength={200} placeholder='e.g. "Every order is hand-packed by the founder. No investors, no shortcuts."' value={answers.brand_differentiator || ''} onChange={e => set('brand_differentiator', e.target.value)} style={{ minHeight: 80 }} />
      </Crd>

      <Crd>
        <Lbl>Location or market</Lbl>
        <Inp placeholder='e.g. "Atlanta, GA" or "Global, online only"' value={answers.brand_location || ''} onChange={e => set('brand_location', e.target.value)} />
      </Crd>

      <Crd>
        <Lbl>Key message or call to action</Lbl>
        <Inp placeholder='e.g. "Visit us at the farmers market every Saturday" or "Download the app today"' value={answers.brand_cta || ''} onChange={e => set('brand_cta', e.target.value)} />
      </Crd>

      <NavRow onBack={onBack} onNext={onNext} disabled={!can} label="Review My Song →" />
    </Shell>
  )
}

// ─── REVIEW ───────────────────────────────────────────────────────────────────
function ReviewStep({ answers, email, setEmail, onBack, onGenerate, onTestGenerate, isBrand, loading, previewError }: { answers: Record<string, string>; email: string; setEmail: (v: string) => void; onBack: () => void; onGenerate: () => void; onTestGenerate: () => void; isBrand: boolean; loading: boolean; previewError?: string }) {
  const emailValid = !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const personalRows = [
    ['For', answers.recipient_name], ['From', answers.sender_name || '—'],
    ['Occasion', answers.occasion?.replace(/_/g, ' ')], ['Genre', GENRE_LABELS[answers.genre]],
    ['Tone', answers.tone], ['Three words', [answers.word1, answers.word2, answers.word3].filter(Boolean).join(', ')],
    ['Special', answers.what_makes_special], ['Memory', answers.favorite_memory || '—'],
    ['Funny', answers.something_funny || '—'], ['Catchphrase', answers.catchphrase || '—'],
    ['Hobby', answers.hobby || '—'], ['Place', answers.city || '—'],
  ]
  const brandRows = [
    ['Brand', answers.brand_name], ['Industry', answers.brand_industry],
    ['What they do', answers.brand_what], ['Genre', GENRE_LABELS[answers.genre]],
    ['Energy', answers.brand_tone], ['Tagline', answers.brand_tagline || '—'],
    ['Audience', answers.brand_audience || '—'], ['Personality', answers.brand_vibe || '—'],
    ['Differentiator', answers.brand_differentiator || '—'], ['Location', answers.brand_location || '—'],
    ['Call to action', answers.brand_cta || '—'],
  ]
  const rows = isBrand ? brandRows : personalRows

  return (
    <Shell step={5} total={5}>
      <StepTitle eyebrow="Almost there!" title={isBrand ? 'Review your brand brief 📋' : 'Review your song brief 📋'} />
      <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 20, overflow: 'hidden', marginBottom: 20 }}>
        {rows.map(([k, v], i) => (
          <div key={k} style={{ display: 'flex', gap: 16, padding: '13px 20px', borderBottom: i < rows.length - 1 ? `1px solid ${G.border}` : 'none', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: G.muted, minWidth: 110, flexShrink: 0, paddingTop: 2 }}>{k}</span>
            <span style={{ fontSize: 14, color: G.ink, lineHeight: 1.5 }}>{v}</span>
          </div>
        ))}
      </div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: G.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginBottom: 20, padding: 0 }}>← Edit answers</button>

      {/* Email capture — required to generate a preview so we can email the
          final song if they buy. Gates the preview (and our Lyria cost). */}
      <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <label htmlFor="preview_email" style={{ display: 'block', fontSize: 13, fontWeight: 700, color: G.ink, marginBottom: 8 }}>
          Your email (to save &amp; send your song)
        </label>
        <input
          id="preview_email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{
            width: '100%', padding: '12px 14px', border: `1.5px solid ${G.border}`, borderRadius: 10,
            fontSize: 15, fontFamily: 'inherit', color: G.ink, background: G.bg,
          }}
        />
        <div style={{ fontSize: 12, color: G.muted, marginTop: 8, lineHeight: 1.5 }}>
          We send you the song here if you buy. No spam; see our <a href="/privacy" style={{ color: G.coral }}>Privacy Policy</a>.
        </div>
      </div>

      {previewError && (
        <div role="alert" style={{ background: '#FEE', border: '1.5px solid #FCA5A5', color: '#991B1B', borderRadius: 12, padding: '12px 14px', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>We couldn&rsquo;t write your song.</div>
          <div>Give it another try in a moment, or email <a href="mailto:hi@makeasongaboutyou.com" style={{ color: '#991B1B', textDecoration: 'underline' }}>hi@makeasongaboutyou.com</a> if it keeps happening.</div>
        </div>
      )}

      <button className="pill" onClick={onGenerate} disabled={loading || !emailValid}
        style={{ width: '100%', background: (loading || !emailValid) ? G.border : `linear-gradient(135deg,${isBrand ? G.navy : G.coral},${isBrand ? G.navyL : G.peach})`, color: (loading || !emailValid) ? G.muted : '#fff', border: 'none', padding: '18px', borderRadius: 99, fontSize: 17, fontWeight: 700, cursor: (loading || !emailValid) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (loading || !emailValid) ? 'none' : `0 6px 24px ${isBrand ? 'rgba(27,42,74,0.35)' : 'rgba(255,107,107,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {loading ? 'Writing your preview…' : `✦ Preview My Song · Free`}
      </button>
      <p style={{ textAlign: 'center', fontSize: 13, color: G.muted, marginTop: 12, lineHeight: 1.5 }}>
        Free preview · lyrics + 20-second audio · you only pay ({PRICE_DISPLAY}) if you love it
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <button onClick={onTestGenerate} disabled={loading} style={{
          width: '100%', padding: '14px 0', borderRadius: 99, border: `2px dashed ${G.muted}`,
          background: 'transparent', color: G.muted, fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 16,
        }}>
          {loading ? 'Generating…' : '🧪 Test Mode — Skip Payment'}
        </button>
      )}
    </Shell>
  )
}

// ─── LOADING ──────────────────────────────────────────────────────────────────
function LoadingScreen({ loadLine, isBrand }: { loadLine: number; isBrand: boolean }) {
  const lines = isBrand ? BRAND_LOAD_LINES : PERSONAL_LOAD_LINES
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 110, height: 110, marginBottom: 40 }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', background: isBrand ? `conic-gradient(${G.navy},${G.navyL},${G.sky},${G.navy})` : `conic-gradient(${G.coral},${G.yellow},${G.mint},${G.sky},${G.lavender},${G.peach},${G.coral})`, animation: 'spin 1.8s linear infinite' }} />
        <div style={{ position: 'absolute', top: '22%', left: '22%', right: '22%', bottom: '22%', borderRadius: '50%', background: G.white }} />
        <div style={{ position: 'absolute', top: '44%', left: '44%', right: '44%', bottom: '44%', borderRadius: '50%', background: isBrand ? G.navy : G.ink }} />
      </div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 34, fontWeight: 700, color: G.ink, marginBottom: 14 }}>
        {isBrand ? 'Writing your theme song…' : 'Writing your song…'}
      </h2>
      <p style={{ fontSize: 16, color: G.muted, animation: 'pulse 1.8s ease infinite' }}>{lines[loadLine]}</p>
    </div>
  )
}

// ─── SONG SCREEN ──────────────────────────────────────────────────────────────
function SongScreen({ song, answers, revealed, regenCount, copied, onRegen, onCopy, onNew, onTikTok, onSend, isBrand, audioUrl, songId }: {
  song: { title: string; sections: { label: string; lines: string[] }[] }
  answers: Record<string, string>; revealed: boolean; regenCount: number; copied: boolean
  onRegen: () => void; onCopy: () => void; onNew: () => void; onTikTok: () => void; onSend: () => void
  isBrand: boolean; audioUrl?: string; songId?: string
}) {
  const isChorus = (l: string) => l?.toLowerCase().includes('chorus') || l?.toLowerCase().includes('outro')
  const gc = GENRE_COLORS[answers.genre] || GENRE_COLORS['70s_love_song']
  const gradColors = isBrand ? [G.navy, G.navyL] : gc.grad
  const accentColor = isBrand ? G.navy : G.coral

  const displayName = isBrand ? answers.brand_name : answers.recipient_name
  const displaySub = isBrand
    ? `${answers.brand_industry} · ${GENRE_LABELS[answers.genre]}`
    : `written for ${answers.recipient_name}${answers.sender_name ? ` · by ${answers.sender_name}` : ''}`

  const captionFn = TIKTOK_CAPTIONS[answers.occasion]
  const caption = captionFn ? captionFn(displayName || 'them') : ''
  const [capCopied, setCapCopied] = useState(false)
  function copyCaption() {
    navigator.clipboard.writeText(caption).then(() => { setCapCopied(true); setTimeout(() => setCapCopied(false), 2000) })
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 20px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 660 }}>

        {/* Album cover */}
        <div className={revealed ? 'fade-up' : ''} style={{ animationDelay: '0s', marginBottom: 40 }}>
          <div style={{ background: `linear-gradient(135deg,${gradColors[0]},${gradColors[1]})`, borderRadius: 28, padding: '48px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 20 }}>
              {isBrand && <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>🏢 Brand Anthem</span>}
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>{GENRE_LABELS[answers.genre]}</span>
              <span style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 99 }}>{isBrand ? answers.brand_tone : answers.tone}</span>
            </div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{isBrand ? '🏢' : '🎵'}</div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(28px,6vw,52px)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1.1, marginBottom: 14, textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
              {song.title || 'Your Song'}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{displaySub}</p>

            {/* Audio player - show when audio is available */}
            {audioUrl && (
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 14 }}>🎶 Play Your Song</div>
                <audio
                  controls
                  style={{
                    width: '100%',
                    height: 40,
                    borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    outline: 'none',
                  }}
                  src={songId ? `/api/audio/${songId}` : audioUrl}
                />
              </div>
            )}
          </div>
        </div>

        {/* Lyrics */}
        <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}>
          {song.sections.map((sec, si) => (
            <div key={si} className={revealed ? 'fade-up' : ''} style={{ animationDelay: `${0.15 + si * 0.12}s`, padding: '28px 32px', borderBottom: si < song.sections.length - 1 ? `1px solid ${G.border}` : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.muted, marginBottom: 14 }}>{sec.label}</div>
              {sec.lines.map((line, li) => (
                <div key={li} style={{ fontFamily: "'Fraunces',serif", fontSize: isChorus(sec.label) ? 'clamp(19px,3.5vw,26px)' : 'clamp(16px,3vw,22px)', fontWeight: isChorus(sec.label) ? 700 : 400, lineHeight: 1.65, color: isChorus(sec.label) ? accentColor : G.ink }}>
                  {line}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* TikTok coach */}
        <div className={revealed ? 'fade-up' : ''} style={{ animationDelay: '0.8s', background: `linear-gradient(135deg,${G.yellow}30,${G.peach}20)`, border: `2px solid ${G.yellow}`, borderRadius: 20, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ fontSize: 28, flexShrink: 0 }}>📱</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G.ink, marginBottom: 4 }}>
                {isBrand ? 'Share your brand anthem' : 'Film the reaction for TikTok'}
              </div>
              <div style={{ fontSize: 13, color: G.muted, marginBottom: 14, lineHeight: 1.5 }}>
                {isBrand
                  ? "Post this on your brand's socials, use it as a podcast intro, or share it with your team. Here's a caption:"
                  : "Show them the song and hit record. The moment they read their name in the chorus is your video. Here's your caption:"}
              </div>
              <div style={{ background: G.white, border: `1.5px solid ${G.border}`, borderRadius: 12, padding: '12px 14px', fontSize: 13, color: G.ink, lineHeight: 1.5, marginBottom: 12, fontStyle: 'italic' }}>
                {caption}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="act" onClick={copyCaption}
                  style={{ background: capCopied ? G.mint : G.white, color: capCopied ? '#fff' : G.ink, border: `1.5px solid ${capCopied ? G.mint : G.border}`, padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {capCopied ? '✓ Copied!' : 'Copy Caption'}
                </button>
                {!isBrand && (
                  <button className="act" onClick={onTikTok}
                    style={{ background: `linear-gradient(135deg,${G.ink},#333)`, color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🎬 Create Lyric Video
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={revealed ? 'fade-up' : ''} style={{ animationDelay: `${0.15 + song.sections.length * 0.12}s` }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="act" onClick={onCopy}
              style={{ background: copied ? G.mint : G.white, color: copied ? '#fff' : G.ink, border: `2px solid ${copied ? G.mint : G.border}`, padding: '12px 22px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              {copied ? '✓ Copied!' : '📋 Copy Lyrics'}
            </button>
            <button className="act" onClick={onSend}
              style={{ background: `linear-gradient(135deg,${isBrand ? G.navy : G.coral},${isBrand ? G.navyL : G.peach})`, color: '#fff', border: 'none', padding: '12px 22px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: `0 4px 14px ${isBrand ? 'rgba(27,42,74,0.3)' : 'rgba(255,107,107,0.3)'}` }}>
              {isBrand ? '📧 Send to Team' : '💌 Send the Song'}
            </button>
            <button className="act" onClick={onNew}
              style={{ background: G.white, color: G.ink, border: `2px solid ${G.border}`, padding: '12px 22px', borderRadius: 99, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
              🎵 Make Another
            </button>
          </div>
          {regenCount < 1 && (
            <button onClick={onRegen} style={{ background: 'none', border: 'none', color: G.muted, fontSize: 13, cursor: 'pointer', marginTop: 16, textDecoration: 'underline', padding: 0, display: 'block' }}>
              Not quite right? Regenerate once →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── TIKTOK VIDEO MODE ────────────────────────────────────────────────────────
function TikTokVideoMode({ song, answers, onBack, songId, audioUrl }: { song: { title: string; sections: { label: string; lines: string[] }[] }; answers: Record<string, string>; onBack: () => void; songId?: string; audioUrl?: string }) {
  const allLines = song.sections.flatMap(s => s.lines.map(l => ({ line: l, isChorus: s.label.toLowerCase().includes('chorus') })))
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [playing, setPlaying] = useState(false)
  const gc = GENRE_COLORS[answers.genre] || GENRE_COLORS['70s_love_song']
  const interval = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  function advance() { setVisible(false); setTimeout(() => { setIdx(i => (i + 1) % allLines.length); setVisible(true) }, 300) }
  function prev() { setVisible(false); setTimeout(() => { setIdx(i => (i - 1 + allLines.length) % allLines.length); setVisible(true) }, 300) }

  useEffect(() => {
    if (playing) { interval.current = setInterval(advance, 2800) }
    else if (interval.current) clearInterval(interval.current)
    return () => { if (interval.current) clearInterval(interval.current) }
  }, [playing, allLines.length])

  // Sync audio with play/pause state
  const audioSrc = songId ? `/api/audio/${songId}` : audioUrl
  useEffect(() => {
    if (!audioRef.current || !audioSrc) return
    if (playing) { audioRef.current.play().catch(() => {}) }
    else { audioRef.current.pause() }
  }, [playing, audioSrc])

  const current = allLines[idx] || { line: '', isChorus: false }
  return (
    <div style={{ minHeight: '100vh', background: G.ink, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
      {audioSrc && <audio ref={audioRef} src={audioSrc} preload="auto" />}
      <button onClick={onBack} style={{ position: 'absolute', top: 24, left: 24, background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: 'pointer', zIndex: 10 }}>← Back</button>
      <div style={{ width: 'min(360px,90vw)', aspectRatio: '9/16', background: `linear-gradient(160deg,${gc.grad[0]},${gc.grad[1]})`, borderRadius: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 28px', position: 'relative', overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', top: 32, left: 0, right: 0, textAlign: 'center', padding: '0 24px' }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{song.title}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>for {answers.recipient_name}</div>
        </div>
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1, width: '100%' }}>
          {visible && (
            <div style={{ animation: 'lyricIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards', fontFamily: "'Fraunces',serif", fontSize: current.isChorus ? 'clamp(22px,5vw,30px)' : 'clamp(18px,4vw,24px)', fontWeight: current.isChorus ? 900 : 700, color: '#fff', lineHeight: 1.4, textShadow: '0 2px 20px rgba(0,0,0,0.3)', padding: '0 8px' }}>
              {current.line}
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {allLines.map((_, i) => (
            <div key={i} style={{ width: i === idx ? 20 : 6, height: 6, borderRadius: 99, background: i === idx ? '#fff' : 'rgba(255,255,255,0.35)', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24, alignItems: 'center' }}>
        <button onClick={prev} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>‹</button>
        <button onClick={() => setPlaying(p => !p)} style={{ background: `linear-gradient(135deg,${G.coral},${G.peach})`, border: 'none', color: '#fff', padding: '12px 28px', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(255,107,107,0.4)' }}>
          {playing ? '⏸ Pause' : '▶ Auto-Play'}
        </button>
        <button onClick={advance} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', fontSize: 18, cursor: 'pointer' }}>›</button>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 14, textAlign: 'center' }}>Screen-record this on your phone and post to TikTok 🎬</p>
    </div>
  )
}

// ─── SEND MODAL ───────────────────────────────────────────────────────────────
function SendSongModal({ song, answers, onBack, isBrand }: { song: { title: string; sections: { label: string; lines: string[] }[] }; answers: Record<string, string>; onBack: () => void; isBrand: boolean }) {
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const gc = GENRE_COLORS[answers.genre] || GENRE_COLORS['70s_love_song']
  const gradColors = isBrand ? [G.navy, G.navyL] : gc.grad

  async function handleSend() {
    if (!email.trim()) return
    setSending(true)
    await new Promise(r => setTimeout(r, 1400))
    setSending(false); setSent(true)
  }

  const lyricsText = [song.title, '', ...song.sections.flatMap(s => [`[${s.label}]`, ...s.lines, ''])].join('\n')

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ animation: 'popIn 0.5s ease', fontSize: 60, marginBottom: 24 }}>{isBrand ? '📧' : '💌'}</div>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 34, fontWeight: 700, color: G.ink, marginBottom: 12 }}>
          {isBrand ? 'Sent to your team!' : 'Song delivered!'}
        </h2>
        <p style={{ fontSize: 16, color: G.muted, maxWidth: 360, marginBottom: 32, lineHeight: 1.6 }}>
          {isBrand
            ? <><strong style={{ color: G.navy }}>{answers.brand_name}</strong> has a theme song. Go do something great with it.</>
            : <><strong style={{ color: G.coral }}>{answers.recipient_name}</strong> is about to have a moment.</>}
        </p>
        <button onClick={onBack} style={{ background: `linear-gradient(135deg,${isBrand ? G.navy : G.coral},${isBrand ? G.navyL : G.peach})`, color: '#fff', border: 'none', padding: '14px 32px', borderRadius: 99, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          ← Back to Song
        </button>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 20px 80px' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: G.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', marginBottom: 28, padding: 0 }}>← Back to Song</button>

        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: isBrand ? G.navy : G.coral, marginBottom: 8 }}>
            {isBrand ? 'Send to Your Team' : 'Send the Song'}
          </div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(26px,5vw,38px)', fontWeight: 700, lineHeight: 1.15 }}>
            {isBrand ? 'Deliver it to your people 📧' : 'Deliver it like a gift 💌'}
          </h2>
          <p style={{ fontSize: 15, color: G.muted, marginTop: 10, lineHeight: 1.6 }}>
            {isBrand
              ? 'Share the theme song with your team, clients, or collaborators.'
              : "They'll receive a beautifully formatted page with the song and your personal note."}
          </p>
        </div>

        {/* Preview card */}
        <div style={{ background: `linear-gradient(135deg,${gradColors[0]},${gradColors[1]})`, borderRadius: 24, padding: '28px 28px', marginBottom: 28, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
          <div style={{ fontSize: 20, marginBottom: 10 }}>{isBrand ? '🏢' : '🎵'}</div>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: 20, fontStyle: 'italic', fontWeight: 700, color: '#fff', marginBottom: 6 }}>{song.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
            {isBrand ? `A brand anthem for ${answers.brand_name}` : `written for ${answers.recipient_name}`}
          </div>
          {song.sections[0] && <div style={{ marginTop: 16, fontFamily: "'Fraunces',serif", fontSize: 15, color: 'rgba(255,255,255,0.85)', fontStyle: 'italic', lineHeight: 1.6 }}>&quot;{song.sections[0].lines[0]}&quot;</div>}
        </div>

        <Crd>
          <Lbl req>Recipient&apos;s email</Lbl>
          <Inp type="email" placeholder={isBrand ? 'teammate@company.com' : 'their@email.com'} value={email} onChange={e => setEmail(e.target.value)} />
        </Crd>

        <Crd>
          <Lbl>{isBrand ? 'Add a note (optional)' : 'Add a personal note'}</Lbl>
          <Txta
            placeholder={isBrand ? 'e.g. "Hey team — had our brand anthem written. This is us now. 🎵"' : 'e.g. "Happy Birthday! Read it all the way to the bridge. Love you."'}
            value={note} onChange={e => setNote(e.target.value)} maxLength={300} style={{ minHeight: 100 }}
          />
        </Crd>

        <button onClick={handleSend} disabled={!email.trim() || sending}
          style={{ width: '100%', background: !email.trim() || sending ? G.border : `linear-gradient(135deg,${isBrand ? G.navy : G.coral},${isBrand ? G.navyL : G.peach})`, color: !email.trim() || sending ? G.muted : '#fff', border: 'none', padding: '18px', borderRadius: 99, fontSize: 16, fontWeight: 700, cursor: !email.trim() || sending ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: !email.trim() || sending ? 'none' : `0 6px 24px ${isBrand ? 'rgba(27,42,74,0.4)' : 'rgba(255,107,107,0.4)'}`, marginBottom: 12 }}>
          {sending ? `Sending… ${isBrand ? '📧' : '💌'}` : `Send ${isBrand ? 'to Team' : 'the Song'} →`}
        </button>

        <div style={{ textAlign: 'center', fontSize: 12, color: G.muted }}>
          Or <button onClick={() => navigator.clipboard.writeText(lyricsText)} style={{ background: 'none', border: 'none', color: isBrand ? G.navy : G.coral, cursor: 'pointer', fontSize: 12, textDecoration: 'underline', padding: 0 }}>copy the lyrics</button> and share them yourself
        </div>
      </div>
    </div>
  )
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Crd({ children }: { children: React.ReactNode }) {
  return <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 16, padding: '18px 20px', marginBottom: 12 }}>{children}</div>
}

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: G.ink, marginBottom: 10 }}>{children}{req && <span style={{ color: G.coral, marginLeft: 3 }}>*</span>}</label>
}

function Inp(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      style={{ width: '100%', border: `2px solid ${G.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: G.ink, background: G.bg, transition: 'border-color 0.2s', outline: 'none', ...(props.style || {}) }}
      onFocus={e => (e.target.style.borderColor = G.coral)}
      onBlur={e => (e.target.style.borderColor = G.border)}
    />
  )
}

function Txta(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props}
      style={{ width: '100%', border: `2px solid ${G.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: G.ink, background: G.bg, resize: 'vertical', minHeight: 100, lineHeight: 1.6, transition: 'border-color 0.2s', outline: 'none', ...(props.style || {}) }}
      onFocus={e => (e.target.style.borderColor = G.coral)}
      onBlur={e => (e.target.style.borderColor = G.border)}
    />
  )
}

function Sel({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div style={{ position: 'relative' }}>
      <select {...props}
        style={{ width: '100%', border: `2px solid ${G.border}`, borderRadius: 10, padding: '12px 14px', fontSize: 15, fontFamily: "'DM Sans',sans-serif", color: props.value ? G.ink : G.muted, background: G.bg, appearance: 'none' as const, cursor: 'pointer', outline: 'none' }}
        onFocus={e => (e.target.style.borderColor = G.coral)}
        onBlur={e => (e.target.style.borderColor = G.border)}>
        {children}
      </select>
      <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: G.muted }}>▾</span>
    </div>
  )
}


// ─── PREVIEW LOADING ──────────────────────────────────────────────────────────
// Shown while /api/preview/generate is working. Similar to the paid-flow
// loading screen but with different copy reflecting that this is free.
function PreviewLoadingScreen({ isBrand }: { isBrand: boolean }) {
  const lines = [
    'Writing your lyrics… ✍️',
    'Sending to Lyria… 🎹',
    'Recording a 20-second snippet… 🎤',
    'Almost there… ✨',
  ]
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % lines.length), 1800)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 110, height: 110, marginBottom: 40 }}>
        <div style={{ width: 110, height: 110, borderRadius: '50%', background: isBrand ? `conic-gradient(${G.navy},${G.navyL},${G.sky},${G.navy})` : `conic-gradient(${G.coral},${G.yellow},${G.mint},${G.sky},${G.lavender},${G.peach},${G.coral})`, animation: 'spin 1.8s linear infinite' }} />
        <div style={{ position: 'absolute', top: '22%', left: '22%', right: '22%', bottom: '22%', borderRadius: '50%', background: G.white }} />
        <div style={{ position: 'absolute', top: '44%', left: '44%', right: '44%', bottom: '44%', borderRadius: '50%', background: isBrand ? G.navy : G.ink }} />
      </div>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: 32, fontWeight: 700, color: G.ink, marginBottom: 14 }}>
        Making your preview…
      </h2>
      <p style={{ fontSize: 16, color: G.muted, animation: 'pulse 1.8s ease infinite', maxWidth: 420 }}>
        {lines[idx]}
      </p>
      <p style={{ fontSize: 13, color: G.muted, marginTop: 40, maxWidth: 420 }}>
        This usually takes 45–90 seconds. Hang tight — no payment required yet.
      </p>
    </div>
  )
}

// ─── PREVIEW STEP ─────────────────────────────────────────────────────────────
// The money step. User sees full lyrics + a 20s audio clip, can regenerate
// up to MAX_REGENS times, and either buys or drops off. This is where our
// Lyria $$ has already been spent, so we want to make buying feel easy.
function PreviewStep({ preview, isBrand, regenLoading, checkoutLoading, onRegen, onCheckout, onBack }: {
  preview: PreviewState
  isBrand: boolean
  regenLoading: boolean
  checkoutLoading: boolean
  onRegen: () => void
  onCheckout: () => void
  onBack: () => void
}) {
  const displayName = preview.recipient_name
  const accentColor = isBrand ? G.navy : G.coral
  const gc = GENRE_COLORS[preview.genre] || GENRE_COLORS['70s_love_song']
  const gradColors = isBrand ? [G.navy, G.navyL] : gc.grad

  // Cache-bust the audio url whenever regen_count changes so the <audio>
  // element refetches instead of serving a cached clip.
  const audioSrc = preview.audio_url_preview
    ? `${preview.audio_url_preview}${preview.audio_url_preview.includes('?') ? '&' : '?'}v=${preview.regen_count}`
    : undefined

  return (
    <div style={{ minHeight: '100vh', padding: '36px 20px 100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 660 }}>

        {/* Preview banner */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <span style={{ background: `${G.yellow}40`, color: '#b45309', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 99 }}>
            👀 Free Preview
          </span>
          <span style={{ fontSize: 13, color: G.muted }}>
            {preview.regens_remaining} regeneration{preview.regens_remaining === 1 ? '' : 's'} left
          </span>
        </div>

        {/* Album cover + audio */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ background: `linear-gradient(135deg,${gradColors[0]},${gradColors[1]})`, borderRadius: 28, padding: '48px 36px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ fontSize: 32, marginBottom: 12 }}>{isBrand ? '🏢' : '🎵'}</div>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: 'clamp(28px,6vw,48px)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1.1, marginBottom: 14, textShadow: '0 2px 20px rgba(0,0,0,0.2)' }}>
              {preview.title}
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              {isBrand ? `A theme song for ${displayName}` : `written for ${displayName}`}
            </p>

            {audioSrc ? (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>🎶 20-second preview</div>
                <audio
                  key={preview.regen_count}
                  controls
                  onPlay={() => phCapture('preview_played', { preview_id: preview.preview_id })}
                  style={{ width: '100%', height: 44, borderRadius: 8, outline: 'none' }}
                  src={audioSrc}
                />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>
                  Full ~60-second track unlocks after purchase
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                Audio rendering is taking longer than usual — regenerate to try again.
              </div>
            )}
          </div>
        </div>

        {/* Lyrics */}
        <div style={{ background: G.white, border: `2px solid ${G.border}`, borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}>
          {preview.sections.map((sec, si) => (
            <div key={si} style={{ padding: '28px 32px', borderBottom: si < preview.sections.length - 1 ? `1px solid ${G.border}` : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: G.muted, marginBottom: 14 }}>{sec.label}</div>
              {sec.lines.map((line, li) => {
                const isChorus = sec.label?.toLowerCase().includes('chorus') || sec.label?.toLowerCase().includes('outro')
                return (
                  <div key={li} style={{ fontFamily: "'Fraunces',serif", fontSize: isChorus ? 'clamp(19px,3.5vw,24px)' : 'clamp(16px,3vw,20px)', fontWeight: isChorus ? 700 : 400, lineHeight: 1.65, color: isChorus ? accentColor : G.ink }}>
                    {line}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            onClick={onRegen}
            disabled={regenLoading || preview.regens_remaining <= 0}
            style={{
              flex: '1 1 auto',
              background: G.white,
              border: `2px solid ${preview.regens_remaining <= 0 ? G.border : G.ink}`,
              color: preview.regens_remaining <= 0 ? G.muted : G.ink,
              padding: '14px 20px',
              borderRadius: 99,
              fontSize: 15,
              fontWeight: 700,
              cursor: (regenLoading || preview.regens_remaining <= 0) ? 'not-allowed' : 'pointer',
              opacity: regenLoading ? 0.6 : 1,
            }}
          >
            {regenLoading
              ? 'Regenerating…'
              : preview.regens_remaining <= 0
                ? 'No regenerations left'
                : `🔄 Regenerate audio (${preview.regens_remaining} left)`}
          </button>
        </div>

        <button
          className="pill"
          onClick={onCheckout}
          disabled={checkoutLoading}
          style={{
            width: '100%',
            background: checkoutLoading ? G.border : `linear-gradient(135deg,${isBrand ? G.navy : G.coral},${isBrand ? G.navyL : G.peach})`,
            color: checkoutLoading ? G.muted : '#fff',
            border: 'none',
            padding: '18px',
            borderRadius: 99,
            fontSize: 17,
            fontWeight: 700,
            cursor: checkoutLoading ? 'not-allowed' : 'pointer',
            boxShadow: checkoutLoading ? 'none' : `0 6px 24px ${isBrand ? 'rgba(27,42,74,0.35)' : 'rgba(255,107,107,0.4)'}`,
          }}
        >
          {checkoutLoading ? 'Starting checkout…' : `✦ Unlock the Full Song — ${PRICE_DISPLAY}`}
        </button>

        <p style={{ textAlign: 'center', fontSize: 13, color: G.muted, marginTop: 12, lineHeight: 1.5 }}>
          Unlocks the full-length audio · delivered to your email · {isIOSApp() ? 'secure payment via Apple' : 'secure checkout via Stripe'}
        </p>
        <p style={{ textAlign: 'center', fontSize: 12, color: G.muted, marginTop: 6, lineHeight: 1.5 }}>
          Previews are saved for 7 days, then automatically cleaned up.
        </p>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: G.muted, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
            ← Back to answers
          </button>
        </div>
      </div>
    </div>
  )
}
