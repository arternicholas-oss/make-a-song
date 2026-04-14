import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Make a Song About You',
  description: 'Terms of Service for Make a Song About You.',
}

export default function TermsPage() {
  return (
    <main style={container}>
      <h1 style={h1}>Terms of Service</h1>
      <p style={muted}>Last updated: April 13, 2026</p>

      <section style={section}>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of makeasongaboutyou.com
          (the &ldquo;Service&rdquo;) operated by Make a Song About You
          (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the Service you agree to these Terms.
          If you do not agree, do not use the Service.
        </p>
      </section>

      <h2 style={h2}>1. The Service</h2>
      <section style={section}>
        <p>
          The Service generates a personalized set of song lyrics and a short audio
          rendition using AI models from Anthropic (Claude) and Google (Lyria). You
          provide prompts about a person, brand, or occasion; we produce a creative
          output based on those prompts.
        </p>
      </section>

      <h2 style={h2}>2. Accounts &amp; eligibility</h2>
      <section style={section}>
        <p>
          You must be at least 13 years old to use the Service. If you are under the
          age of majority in your jurisdiction, a parent or guardian must agree to
          these Terms on your behalf.
        </p>
      </section>

      <h2 style={h2}>3. Payments</h2>
      <section style={section}>
        <p>
          Purchases are processed by Stripe. We do not store payment card data. All
          prices are in US dollars and billed one-time per song. See our{' '}
          <Link href="/refund" style={link}>Refund Policy</Link> for refund terms.
        </p>
      </section>

      <h2 style={h2}>4. Ownership &amp; license</h2>
      <section style={section}>
        <p>
          Subject to these Terms and your full payment, you own the lyrics and audio
          generated for your personal, non-commercial use and as a gift. For brand
          anthems, you may use the output commercially only in the channels you
          specified during your order.
        </p>
        <p>
          You agree not to resell the output, redistribute it on stock-music
          marketplaces, or train any machine-learning model on it without our
          written consent.
        </p>
      </section>

      <h2 style={h2}>5. AI-generated content disclaimer</h2>
      <section style={section}>
        <p>
          AI models occasionally produce unexpected, offensive, or inaccurate
          content, including mispronunciations in audio. We preview lyrics and
          audio before purchase so you can regenerate up to three times before
          committing. By purchasing, you accept the specific preview you approved.
        </p>
      </section>

      <h2 style={h2}>6. Acceptable use</h2>
      <section style={section}>
        <p>
          You agree not to submit prompts that are illegal, defamatory, harassing,
          sexually explicit involving minors, or that infringe the rights of any
          person. We may refuse to generate, or remove, any output we believe
          violates these rules.
        </p>
      </section>

      <h2 style={h2}>7. Third-party services</h2>
      <section style={section}>
        <p>
          We use third-party services including Stripe (payments), Supabase
          (storage), Anthropic (lyrics), Google Lyria (music), Resend (email), and
          Vercel (hosting). Your use of the Service is subject to those providers&apos;
          terms as well.
        </p>
      </section>

      <h2 style={h2}>8. Availability &amp; warranties</h2>
      <section style={section}>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind,
          express or implied, to the fullest extent permitted by law.
        </p>
      </section>

      <h2 style={h2}>9. Limitation of liability</h2>
      <section style={section}>
        <p>
          To the maximum extent permitted by law, our total liability for any claim
          arising out of or related to these Terms or the Service shall not exceed
          the amount you paid us in the 12 months preceding the claim.
        </p>
      </section>

      <h2 style={h2}>10. Changes</h2>
      <section style={section}>
        <p>
          We may update these Terms from time to time. Material changes will be
          announced on this page. Continued use of the Service after an update
          constitutes acceptance.
        </p>
      </section>

      <h2 style={h2}>11. Contact</h2>
      <section style={section}>
        <p>
          Questions? Email{' '}
          <a href="mailto:hello@makeasongaboutyou.com" style={link}>
            hello@makeasongaboutyou.com
          </a>.
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
