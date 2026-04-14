import { supabaseAdmin } from './supabase'

/**
 * Cheap DB-backed rate limiter. Not atomic — race-safe enough for our scale
 * (single-region Vercel, low QPS). For serious abuse we'd move to Redis.
 *
 * Usage:
 *   const r = await checkRate(ip, 'preview_create', 5, 3600)  // 5 per hour
 *   if (!r.allowed) return 429
 */
export async function checkRate(
  ip: string,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; count: number; remaining: number }> {
  if (!ip || ip === 'unknown') {
    // If we can't identify an IP, don't block; rely on email-level dedupe.
    return { allowed: true, count: 0, remaining: limit }
  }

  // Bucket start = current time truncated to the window boundary.
  const now = Date.now()
  const bucketStart = new Date(Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000))

  // Try to fetch or create the counter row.
  const { data: existing } = await supabaseAdmin
    .from('ip_rate_limit')
    .select('count')
    .eq('ip', ip)
    .eq('action', action)
    .eq('window_start', bucketStart.toISOString())
    .maybeSingle()

  const currentCount = existing?.count ?? 0

  if (currentCount >= limit) {
    return { allowed: false, count: currentCount, remaining: 0 }
  }

  // Increment (upsert). Not atomic, but acceptable here.
  await supabaseAdmin
    .from('ip_rate_limit')
    .upsert(
      {
        ip,
        action,
        window_start: bucketStart.toISOString(),
        count: currentCount + 1,
      },
      { onConflict: 'ip,action,window_start' }
    )

  return { allowed: true, count: currentCount + 1, remaining: limit - (currentCount + 1) }
}

export function getClientIp(req: Request): string {
  const h = (name: string) => req.headers.get(name) || ''
  const fwd = h('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h('x-real-ip') || h('cf-connecting-ip') || 'unknown'
}
