import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Make a Song About You',
  description: 'Privacy Policy for Make a Song About You.',
}

export default function PrivacyPage() {
  return (
    <main style={container}>
      <h1 style={h1}>Privacy Policy</h1>
      <p style={muted}>Last updated: April 13, 2026</p>

      <section style={section}>
        <p>
          This Privacy Policy explains what data Make a Song About You collects,
          how we use it, and who we share it with.
        </p>
      </section>

      <h2 style={h2}>What we collect</h2>
      <section style={section}>
        <p>
          <strong>From you directly:</strong> the email address you provide, the
          answers you submit in the questionnaire, and the generated song output.
        </p>
        <p>
          <strong>Automatically:</strong> your IP address, rough usage analytics
          (pages viewed, events like &ldquo;preview generated&rdquo;), and basic
          browser metadata. We use PostHog for product analytics.
        </p>
        <p>
          <strong>Via Stripe:</strong> Stripe collects payment data directly. We
          receive a transaction reference and your email. We never see your card
          number.
        </p>
      </section>

      <h2 style={h2}>How we use it</h2>
      <section style={section}>
        <p>
          To generate and deliver your song, process payments, send you the
          completion email, provide customer support, investigate abuse, and
          improve the Service.
        </p>
      </section>

      <h2 style={h2}>Who we share it with</h2>
      <section style={section}>
        <p>
          <strong>Anthropic &amp; Google:</strong> the prompts you submit are sent
          to these providers to generate lyrics and audio. They do not, per their
          API terms, train their models on your inputs.
        </p>
        <p>
          <strong>Stripe:</strong> for payment processing.
        </p>
        <p>
          <strong>Supabase:</strong> we store your order, preview, and generated
          song data in Supabase.
        </p>
        <p>
          <strong>Resend:</strong> we use Resend to send transactional email.
        </p>
        <p>
          <strong>PostHog:</strong> we use PostHog for product analytics.
        </p>
        <p>
          We do not sell personal information.
        </p>
      </section>

      <h2 style={h2}>Retention</h2>
      <section style={section}>
        <p>
          Preview data is retained for 7 days unless you purchase. Purchased songs
          are retained for 30 days from purchase, after which their shareable URL
          expires (data may persist in our backups for up to 90 days for accounting
          and support).
        </p>
      </section>

      <h2 style={h2}>Your rights</h2>
      <section style={section}>
        <p>
          You can request access to or deletion of your data at any time by
          emailing{' '}
          <a href="mailto:privacy@makeasongaboutyou.com" style={link}>
            privacy@makeasongaboutyou.com
          </a>. Depending on your jurisdiction (e.g., GDPR, CCPA), you may have
          additional rights; we honor those requests.
        </p>
      </section>

      <h2 style={h2}>Cookies</h2>
      <section style={section}>
        <p>
          We store a small session identifier in your browser&apos;s localStorage
          to keep track of your in-progress song. We use analytics cookies via
          PostHog. We do not use advertising cookies.
        </p>
      </section>

      <h2 style={h2}>Children</h2>
      <section style={section}>
        <p>
          The Service is not directed to children under 13, and we do not knowingly
          collect data from them.
        </p>
      </section>

      <h2 style={h2}>Changes</h2>
      <section style={section}>
        <p>
          Material changes to this policy will be announced on this page.
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
const link: React.CSSProperties = { color: '#FF6B6B', textDecoration: 'underline' }
const footer: React.CSSProperties = { marginTop: 48, paddingTop: 24, borderTop: '1px solid #EDE8E0', fontSize: 14 }
