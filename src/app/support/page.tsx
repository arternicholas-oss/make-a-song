import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support — Make a Song About You',
  description: 'Get help with your personalized song order, refunds, or general questions.',
}

export default function SupportPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#FFF9F0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#1a1410',
      padding: '40px 20px',
    }}>
      <div style={{
        maxWidth: 640,
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          color: '#1a1410',
        }}>
          Support
        </h1>
        <p style={{
          fontSize: 18,
          color: '#9A8F88',
          marginBottom: 40,
        }}>
          We&apos;re here to help with your Make a Song About You experience.
        </p>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Contact Us</h2>
          <p style={{ lineHeight: 1.7, marginBottom: 16 }}>
            For any questions, issues with your order, or general feedback, please email us at:
          </p>
          <a
            href="mailto:support@makeasongaboutyou.com"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#FF6B6B',
              color: '#fff',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: 16,
            }}
          >
            support@makeasongaboutyou.com
          </a>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Frequently Asked Questions</h2>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>How long does it take to get my song?</h3>
            <p style={{ lineHeight: 1.7, color: '#555' }}>
              Your personalized song is generated in under 60 seconds after purchase. You&apos;ll receive it instantly in the app and via email.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Can I get a refund?</h3>
            <p style={{ lineHeight: 1.7, color: '#555' }}>
              Yes! If you&apos;re not happy with your song, we offer refunds. For web purchases, visit our{' '}
              <a href="/refund" style={{ color: '#FF6B6B' }}>refund page</a>. For purchases made through the iOS app, request a refund through Apple.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Can I share my song?</h3>
            <p style={{ lineHeight: 1.7, color: '#555' }}>
              Absolutely! Every song comes with a unique shareable link you can send to anyone. The recipient can listen as many times as they want.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>What if my song doesn&apos;t sound right?</h3>
            <p style={{ lineHeight: 1.7, color: '#555' }}>
              Before purchasing, you get a free 30-second preview so you can hear the song first. If you&apos;re not satisfied with the preview, you can regenerate it up to 3 times at no cost.
            </p>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 6 }}>Is my personal information safe?</h3>
            <p style={{ lineHeight: 1.7, color: '#555' }}>
              Yes. We only use the information you provide to generate your song. Read our{' '}
              <a href="/privacy" style={{ color: '#FF6B6B' }}>privacy policy</a> for full details.
            </p>
          </div>
        </section>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 12 }}>Response Time</h2>
          <p style={{ lineHeight: 1.7 }}>
            We typically respond to support requests within 24 hours. For urgent issues, please include &quot;URGENT&quot; in your email subject line.
          </p>
        </section>

        <footer style={{
          borderTop: '1px solid #EDE8E0',
          paddingTop: 24,
          marginTop: 40,
          textAlign: 'center',
          color: '#9A8F88',
          fontSize: 14,
        }}>
          <a href="/" style={{ color: '#FF6B6B', textDecoration: 'none' }}>← Back to Make a Song About You</a>
          <p style={{ marginTop: 12 }}>
            <a href="/privacy" style={{ color: '#9A8F88', marginRight: 16 }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#9A8F88', marginRight: 16 }}>Terms of Service</a>
            <a href="/refund" style={{ color: '#9A8F88' }}>Refund Policy</a>
          </p>
        </footer>
      </div>
    </main>
  )
}
