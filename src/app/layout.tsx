import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { PostHogProvider } from '@/components/PostHogProvider'
import { SiteFooter } from '@/components/SiteFooter'
import { CapacitorNativeInit } from '@/components/CapacitorNativeInit'

export const metadata: Metadata = {
  title: 'Make a Song About You — Personalized AI Song Lyrics',
  description: 'Answer a few questions about someone you love. We\'ll write them a song that could only ever be about them.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Song About You',
  },
  openGraph: {
    title: 'Make a Song About You',
    description: 'A personalized song written just for them. In under 60 seconds.',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Make a Song About You',
    description: 'A personalized song written just for them. In under 60 seconds.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  themeColor: '#EF6A60',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,700;0,9..144,900;1,9..144,400;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap"
        />
        {/* iOS splash screen color */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="bg-cream min-h-screen font-sans">
        <PostHogProvider>
          {children}
          <SiteFooter />
        </PostHogProvider>
        <ServiceWorkerRegistration />
        <CapacitorNativeInit />
      </body>
    </html>
  )
}
