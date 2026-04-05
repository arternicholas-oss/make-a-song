import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Make a Song About You — Personalized AI Song Lyrics',
  description: 'Answer a few questions about someone you love. We\'ll write them a song that could only ever be about them.',
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
      </head>
      <body className="bg-cream min-h-screen font-sans">{children}</body>
    </html>
  )
}
