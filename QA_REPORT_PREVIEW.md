# QA Audit — Preview-Before-Purchase Build

Audit date: 2026-04-13. Base commit: `ca190bc`.

Scope: every user-facing workflow in the preview-first flow (happy path, failure paths, admin/ops, security, migration). Typecheck clean.

---

## BLOCKERS — fix before deploy

### B1. Checkout allowed on audio-less previews → paid song with no audio
**File:** `src/app/api/preview/checkout/route.ts:49`

`/api/preview/generate` swallows Lyria failures (line 163-167), persists the preview row with `audio_path_full = null`, and returns `{ audio_url_preview: undefined }`. The PreviewStep gracefully tells the user to regenerate — but `/api/preview/checkout` has no guard against checking out an audio-less preview. A confused user clicks "Unlock the Full Song", pays $14.99, and `promotePreviewToSong` writes a song row with `audio_url = undefined`. They receive an email and a song page with lyrics only, no audio.

**Fix:** reject checkout when `preview.audio_path_full` is null.

### B2. Promote failure silently regenerates a different song
**File:** `src/app/api/webhook/route.ts:84-115`

If `promotePreviewToSong` returns `{ ok: false }` (any transient Supabase storage error, song insert RLS hiccup, etc.), the webhook falls through to the legacy `/api/generate` path which runs Anthropic + Lyria from scratch against `order.answers`. Customer paid for the audio they heard in the preview; they receive a completely different song. Refund complaints guaranteed.

**Fix:** on promote failure, mark order `status='failed'` and let the cron auto-refund + apology email. Don't silently swap songs.

### B3. Migration not idempotent — re-run fails on trigger
**File:** `supabase-migration-previews.sql:57-59`

Migration header claims "safe to re-run" but `create trigger previews_updated_at` has no `drop trigger if exists` guard. A second run errors out partway, leaving a partially-applied migration. Also: references `update_updated_at()` which comes from `supabase-schema.sql`; if someone runs this migration against a DB that never had the base schema, the trigger creation fails.

**Fix:** add `drop trigger if exists previews_updated_at on previews;` before `create trigger`.

---

## HIGH — fix before deploy

### H1. `/api/email/song-ready` has no auth gate
**File:** `src/app/api/email/song-ready/route.ts`

Anyone can POST `{songId}` and trigger a Resend email (costing us send credits and potentially spamming the registered buyer). Low exploit value since the email goes to the real buyer, not the attacker — but it's a free denial-of-service against our Resend quota.

**Fix:** require `x-internal-secret` header matching an env var (webhook sets it), or dedupe via a DB flag (`song.email_sent_at`).

### H2. No idempotency marker on the song-ready email
**File:** `src/app/api/webhook/route.ts:205`

Even though `promote()` short-circuits on retry (line 152), the email endpoint has no record that it already sent. If webhook delivery races with cron, or the internal fetch retries, customer gets duplicate emails. Small blast radius but looks sloppy.

**Fix:** add `email_sent_at` column on `songs`; short-circuit in song-ready if set.

### H3. Rate limit parses untrusted client header
**File:** `src/lib/rate-limit.ts:59`

`x-forwarded-for` is spoofable unless Vercel strips it at ingress (it does in practice — Vercel sets it from the actual connecting IP). Documented reliance on Vercel is fine but call it out in `DEPLOY_NOTES.md` so future ops don't move this to another host and silently break rate limiting.

**Fix:** note in DEPLOY_NOTES that rate limiting depends on Vercel's edge rewriting of `x-forwarded-for`. No code change.

---

## MEDIUM — track, fix post-deploy

**M1.** Legacy `/api/generate` writes to public `songs-audio` bucket (unchanged). New preview-first flow uses private bucket. Mixed bucket state works but is a loose end.

**M2.** No cron to delete expired previews (`previews.expires_at` set but nothing reads it). Storage grows unbounded.

**M3.** Funnel events declared but never fired: `LANDING_VIEWED`, `QUIZ_STARTED`, `QUIZ_COMPLETED`, `SONG_VIEWED`. Funnel will have gaps on day 1. (`PREVIEW_PLAYED` IS fired on the audio element's `onPlay`.)

**M4.** Preview expiry not enforced. `/api/preview/regenerate` and `/api/preview/checkout` will happily work on a >7-day-old preview.

**M5.** `/api/audio/[songId]` fallback to `song.audio_url` uses a stored 7-day signed URL. For any song with a `preview_id` we generate a fresh 5-min signed URL (good). For legacy songs without `preview_id`, the stored URL may be public (good, legacy) or expire (bad). Log a warning when falling back to `song.audio_url`.

**M6.** Non-atomic rate-limit increment in `rate-limit.ts`. Worst case: a determined user gets 6-7 previews/hour instead of 5. Acceptable; flag for Redis move if abuse happens.

**M7.** Cron monitor uses `NEXT_PUBLIC_APP_URL` for internal `/api/refund` call. If unset, the refund fetch silently fails. Add fallback to `req.nextUrl.origin` or throw on missing env at boot.

**M8.** `preview/checkout`'s order upsert uses `onConflict: 'session_id'`. If user generates preview A, starts checkout, backs out, generates preview B, and starts checkout again — B's upsert overwrites row's `preview_id`. Webhook uses Stripe metadata's `preview_id` so promotion still works, but the order row's own `preview_id` column drifts out of sync.

**M9.** Redundant type guard `if (promoted.ok !== true)` at webhook:84. Control flow already guarantees `ok === false` here. Harmless.

---

## LOW / Nits

**L1.** Webhook `status: previewId ? 'paid' : 'paid'` is a no-op ternary (webhook/route.ts:47).

**L2.** Preview email template uses `${tone}` directly — if tone has HTML chars it's an XSS vector on the email client. Only user-controlled via the answers form, low risk since we validated strings, but we should `htmlEscape` in the email template.

**L3.** Audio response sets `Cache-Control: private, max-age=3600` — 1 hour cache is fine but signed URL expires in 5 min; could desync with aggressive browser cache. Unlikely to matter in practice.

---

## Cross-cutting verifications (pass)

- Typecheck clean (`tsc --noEmit` silent).
- Stripe webhook signature verification intact (stripe.webhooks.constructEvent).
- Payment gate at `/api/audio/[songId]` is correct: requires `order.paid && status ∈ {paid, generating, completed}`.
- Signed URL never leaks to client — `/api/audio` proxies bytes.
- Session ownership enforced at regen + checkout.
- Webhook promote is idempotent (short-circuits on `promoted_song_id`).
- Preview payload sanitized (no `audio_url_full`, no `audio_path_full`).
- CheckoutSuccessClient polls `/api/song-by-session` and redirects as soon as the song row exists; with synchronous promote it should be <5s.
- `test-generate` is gated behind `NODE_ENV !== 'production' || ALLOW_TEST_GENERATE === 'true'`.

---

## Fix plan

Applied (in commit following this report):

- **B1** — `/api/preview/checkout` now rejects with 409 if `preview.audio_path_full` is null.
- **B2** — webhook no longer silently regenerates on promote failure. Instead: marks order `status='failed'`, kicks an internal refund call (fire-and-forget), returns `flow: 'promote_failed'`. Customer gets apology + refund in seconds.
- **B3** — migration now drops existing `previews_updated_at` trigger before re-creating, and `create or replace function update_updated_at()` is defined in this file so the migration runs standalone.
- **H1** — `/api/email/song-ready` gated on `x-internal-secret` header (falls back to `REFUND_ADMIN_TOKEN` so no new env var is mandatory). Webhook's internal call updated to pass the header.
- **H2** — `songs.email_sent_at` column added; email route short-circuits if already sent and marks after sending.
- **H3** — Documented Vercel's `x-forwarded-for` edge-rewrite guarantee in `DEPLOY_NOTES.md`.

Typecheck clean after fixes.

Second round (Medium + Low, same commit as M/L rollup):

- **M1** — legacy `/api/generate` and `/api/test-generate` now upload to the private `songs-audio-private` bucket under `{songId}.mp3` and store a 7-day signed URL on `songs.audio_url`.
- **M2** — new `/api/monitor/cleanup-previews` cron endpoint (gated on `x-cron-secret`) deletes expired, unpurchased preview rows and their storage objects. Bounded to 500 per run. Wired in `DEPLOY_NOTES.md` under daily cron.
- **M3** — `App.tsx` fires `landing_viewed`, `quiz_started`, `quiz_completed`, `song_viewed` via a step-change `useEffect`. Funnel will be complete from day 1.
- **M4** — `/api/preview/regenerate` and `/api/preview/checkout` both return 410 Gone when `preview.expires_at < now()`.
- **M5** — `/api/audio/[songId]` now tries both `{preview_id}.mp3` and `{song_id}.mp3` paths in the private bucket, falling back to stored `audio_url` with a `console.warn` for legacy songs.
- **M7** — `/api/monitor/failures` falls back to `req.nextUrl.origin` for the internal refund call when `NEXT_PUBLIC_APP_URL` is unset.
- **M8** — `DEPLOY_NOTES.md` now documents the `orders.preview_id` drift quirk: trust Stripe metadata, not the order row's column, when debugging which preview was paid for.
- **M6 / M9** — left as-is per report (rate-limit non-atomicity accepted risk; redundant guard already refactored to a typed `promoteErr`).
- **L1** — webhook no-op ternary (`status: previewId ? 'paid' : 'paid'`) removed.
- **L2** — new `src/lib/html.ts` with `htmlEscape`; applied to user-controlled fields in `song-ready` and `refund` email templates (recipient name, title, tone, genre, lyric lines, refund reason).
- **L3** — `/api/audio/[songId]` cache header tightened from `max-age=3600` to `max-age=300` to match the 5-minute signed URL TTL.

Typecheck clean after second round. Ready to ship.
