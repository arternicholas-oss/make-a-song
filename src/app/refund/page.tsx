import Link from 'next/link'

export const metadata = {
  title: 'Refund Policy — Make a Song About You',
  description: 'Refund Policy for Make a Song About You.',
}

export default function RefundPage() {
  return (
    <main style={container}>
      <h1 style={h1}>Refund Policy</h1>
      <p style={muted}>Last updated: April 13, 2026</p>

      <section style={section}>
        <p>
          Because we generate custom AI content that can&apos;t be &ldquo;returned,&rdquo;
          we let you preview your song in full — lyrics and a 20-second audio
          sample — before you pay a cent. You can also regenerate the audio up to
          three times if Lyria mispronounces a word or the vibe isn&apos;t right.
          This means that by the time you click &ldquo;Buy,&rdquo; you&apos;ve
          already approved the creative output.
        </p>
      </section>

      <h2 style={h2}>Automatic refunds</h2>
      <section style={section}>
        <p>
          We will <strong>automatically refund</strong> you, no questions asked, if:
        </p>
        <ul style={list}>
          <li>Our systems fail to deliver your finished song within 5 minutes of payment.</li>
          <li>The audio file we deliver is materially different from the preview you approved.</li>
          <li>A bug on our end results in a duplicate charge.</li>
        </ul>
      </section>

      <h2 style={h2}>Discretionary refunds</h2>
      <section style={section}>
        <p>
          If you&apos;re unhappy for any other reason within 7 days of purchase,
          email{' '}
          <a href="mailto:refund@makeasongaboutyou.com" style={link}>
            refund@makeasongaboutyou.com
          </a>{' '}
          with your order email and a short note. We review every request and
          issue a refund when the situation warrants it.
        </p>
      </section>

      <h2 style={h2}>What we don&apos;t refund</h2>
      <section style={section}>
        <p>
          We generally do not refund orders where you approved the full preview,
          used your regenerations, and simply changed your mind. We also reserve
          the right to deny refunds for clearly abusive requests (e.g., repeated
          refund requests across multiple orders).
        </p>
      </section>

      <h2 style={h2}>How long it takes</h2>
      <section style={section}>
        <p>
          Refunds are processed via Stripe. Once approved, the amount typically
          posts back to your card within 5–10 business days.
        </p>
      </section>

      <footer style={footer}>
        <Link href="/" style={link}>← Back to makeasongaboutyou.com</Link>
      </footer>
    </main>
  )
}

const container: React.CSSProperties = {
  maxWidth: 720, margin: '0 auto', padding: '60px 24px', fontFamily: "'DM Sans',sans-serif",
  color: '#1a1410', lineHeight: 1.65, fontSize: 16,
}
const h1: React.CSSProperties = { fontFamily: "'Fraunces',serif", fontSize: 40, fontWeight: 800, marginBottom: 8 }
const h2: React.CSSProperties = { fontFamily: "'Fraunces',serif", fontSize: 22, fontWeight: 700, margin: '32px 0 12px' }
const muted: React.CSSProperties = { color: '#9A8F88', fontSize: 14, marginBottom: 24 }
const section: React.CSSProperties = { marginBottom: 8 }
const list: React.CSSProperties = { paddingLeft: 20, margin: '8px 0' }
const link: React.CSSProperties = { color: '#FF6B6B', textDecoration: 'underline' }
const footer: React.CSSProperties = { marginTop: 48, paddingTop: 24, borderTop: '1px solid #EDE8E0', fontSize: 14 }
