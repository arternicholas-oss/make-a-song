/**
 * Thin PostHog wrapper — browser + server.
 *
 * On the client, we use posthog-js. On the server (API routes), we use
 * posthog-node for events we fire from backend (e.g. preview_generated,
 * purchase_completed, generation_failed).
 *
 * All event names are defined as constants below so we don't mistype.
 * If POSTHOG_KEY isn't set, events are silently dropped — safe in local dev.
 */

// ─── EVENT NAMES ─────────────────────────────────────────────────────────────
export const EVT = {
  LANDING_VIEWED: 'landing_viewed',
  QUIZ_STARTED: 'quiz_started',
  QUIZ_COMPLETED: 'quiz_completed',
  PREVIEW_EMAIL_SUBMITTED: 'preview_email_submitted',
  PREVIEW_GENERATION_STARTED: 'preview_generation_started',
  PREVIEW_GENERATED: 'preview_generated',
  PREVIEW_GENERATION_FAILED: 'preview_generation_failed',
  PREVIEW_PLAYED: 'preview_played',
  PREVIEW_REGENERATED: 'preview_regenerated',
  CHECKOUT_STARTED: 'checkout_started',
  CHECKOUT_COMPLETED: 'checkout_completed',
  GENERATION_FAILED: 'generation_failed',
  SONG_VIEWED: 'song_viewed',
  REFUND_ISSUED: 'refund_issued',
} as const

export type EvtName = (typeof EVT)[keyof typeof EVT]

// ─── SERVER ─────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _serverClient: any = null

function getServerClient() {
  if (_serverClient) return _serverClient
  const key = process.env.POSTHOG_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PostHog } = require('posthog-node')
    _serverClient = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,          // flush every event; serverless is short-lived
      flushInterval: 0,
    })
    return _serverClient
  } catch {
    return null
  }
}

export function serverCapture(
  distinctId: string,
  event: EvtName,
  properties: Record<string, unknown> = {}
) {
  const client = getServerClient()
  if (!client) return
  try {
    client.capture({ distinctId, event, properties })
  } catch (err) {
    console.error('[posthog] server capture failed:', err)
  }
}

export async function flushServer() {
  const client = getServerClient()
  if (!client) return
  try {
    await client.flush()
  } catch {
    // ignore
  }
}
