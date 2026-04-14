'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'

/**
 * Client-side PostHog bootstrap. Dropped into the root layout so every page
 * view is captured automatically. Events from App.tsx use the default
 * `posthog.capture(event, props)` API.
 *
 * Safe to include when the key isn't set — we no-op init in that case.
 */
let initialized = false

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: false,
    })
    initialized = true
  }, [])

  return <>{children}</>
}

/**
 * Utility for firing events from anywhere in the client tree. Falls back to
 * a noop if posthog-js hasn't initialized (no key in env).
 */
export function phCapture(event: string, properties: Record<string, unknown> = {}) {
  try {
    if (typeof window !== 'undefined' && (posthog as any)?.__loaded) {
      posthog.capture(event, properties)
    }
  } catch {
    /* ignore */
  }
}

export function phIdentify(distinctId: string, props: Record<string, unknown> = {}) {
  try {
    if (typeof window !== 'undefined' && (posthog as any)?.__loaded) {
      posthog.identify(distinctId, props)
    }
  } catch {
    /* ignore */
  }
}
