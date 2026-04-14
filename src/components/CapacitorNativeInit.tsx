'use client'

import { useEffect } from 'react'

/**
 * CapacitorNativeInit
 *
 * Runs only inside the native iOS / Android shell (Capacitor.isNativePlatform()).
 * Web visitors to makeasongaboutyou.com see this as a no-op.
 *
 * Responsibilities:
 *   1. Hide the native splash screen as soon as React has mounted.
 *   2. Theme the status bar to match the site's cream background.
 *   3. Close deep links landed on /song/[id] correctly (nothing to do here —
 *      the WebView navigates to the URL automatically via server.url).
 *
 * Dynamic imports keep Capacitor out of the web bundle.
 */
export function CapacitorNativeInit() {
  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return
        if (cancelled) return

        const [{ SplashScreen }, { StatusBar, Style }] = await Promise.all([
          import('@capacitor/splash-screen'),
          import('@capacitor/status-bar'),
        ])

        // Match the cream app background instead of a harsh white flash.
        try {
          await StatusBar.setStyle({ style: Style.Dark })
          if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#EF6A60' })
          }
        } catch {
          /* StatusBar not available on iPad split-view etc. — ignore */
        }

        // Give the WebView a beat to paint the first frame, then reveal.
        setTimeout(() => {
          SplashScreen.hide().catch(() => {})
        }, 400)
      } catch {
        // @capacitor/core not installed (web build). No-op.
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
