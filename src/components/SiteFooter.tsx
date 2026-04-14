import Link from 'next/link'

/**
 * Minimal global footer — legal links + contact. Lives in root layout so it
 * appears on every page, including the conversion funnel.
 */
export function SiteFooter() {
  return (
    <footer
      style={{
        maxWidth: 900,
        margin: '0 auto',
        padding: '36px 24px 48px',
        fontFamily: "'DM Sans',sans-serif",
        fontSize: 13,
        color: '#9A8F88',
        textAlign: 'center',
        borderTop: '1px solid #EDE8E0',
      }}
    >
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <Link href="/terms" style={linkStyle}>Terms</Link>
        <Link href="/privacy" style={linkStyle}>Privacy</Link>
        <Link href="/refund" style={linkStyle}>Refunds</Link>
        <a href="mailto:hello@makeasongaboutyou.com" style={linkStyle}>Contact</a>
      </div>
      <div>© {new Date().getFullYear()} Make a Song About You · makeasongaboutyou.com</div>
    </footer>
  )
}

const linkStyle: React.CSSProperties = { color: '#9A8F88', textDecoration: 'underline', textUnderlineOffset: 3 }
