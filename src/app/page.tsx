'use client'

// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPER NOTE:
// The full interactive app (landing through song output) is built as a single
// React component in src/components/App.tsx.
//
// This page simply renders that component. The component handles all routing
// internally via useState (no Next.js routing needed for the questionnaire flow).
//
// The ONLY pages that need separate Next.js routes are:
//   /song/[songId]       — shareable song page (server-rendered for SEO/OG tags)
//   /checkout/success    — redirect target after Stripe payment
//   /waitlist            — optional standalone waitlist page
// ─────────────────────────────────────────────────────────────────────────────

import App from '@/components/App'

export default function Home() {
  return <App />
}
