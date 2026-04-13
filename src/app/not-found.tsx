export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', textAlign: 'center',
      background: '#FFF9F0', fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ fontSize: 56, marginBottom: 24 }}>🎵</div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, color: '#1a1410', marginBottom: 12 }}>
        Page not found
      </h1>
      <p style={{ fontSize: 16, color: '#9A8F88', maxWidth: 380, marginBottom: 32, lineHeight: 1.6 }}>
        We couldn&apos;t find what you were looking for. If you were trying to open a song, the link may have expired — songs are stored for 30 days after creation.
      </p>
      <a href="/" style={{
        background: 'linear-gradient(135deg, #FF6B6B, #FF9F43)',
        color: '#fff', textDecoration: 'none',
        padding: '14px 32px', borderRadius: 99, fontSize: 15,
        fontWeight: 700, display: 'inline-block',
      }}>
        Make a New Song →
      </a>
    </div>
  )
}
