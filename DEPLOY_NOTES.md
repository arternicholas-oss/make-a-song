# Deploy notes — preview-before-purchase + customer readiness

This release adds the free-preview flow, refund automation, legal pages, and
analytics. Follow these steps in order before the new code is live.

## 1. Install deps

```bash
cd /path/to/make-a-song
npm install
```

New runtime deps: `ffmpeg-static`, `fluent-ffmpeg`, `posthog-js`, `posthog-node`.
New dev dep: `@types/fluent-ffmpeg`.

## 2. Run the Supabase migration

1. Open <https://supabase.com/dashboard/project/_/sql/new>
2. Paste the contents of `supabase-migration-previews.sql`
3. Run.

Then create two new storage buckets in the Supabase dashboard:

| Bucket                | Visibility | Purpose                              |
| --------------------- | ---------- | ------------------------------------ |
| `previews-audio`      | Public     | 20-second preview clips              |
| `songs-audio-private` | Private    | Full-length audio; signed URLs only  |

The legacy `songs-audio` bucket can stay for already-delivered orders.

## 3. Environment variables

Add these to Vercel (Project Settings → Environment Variables) for both
Production and Preview environments. Restart the deployment after adding.

| Variable                  | Value / Notes                                                    |
| ------------------------- | ---------------------------------------------------------------- |
| `REFUND_ADMIN_TOKEN`      | Random 32+ char string. Used by `/api/refund` and `/api/monitor`. |
| `CRON_SECRET`             | Random 32+ char string. Used by `/api/monitor/failures`.         |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog project key (public).                                    |
| `NEXT_PUBLIC_POSTHOG_HOST`| `https://us.i.posthog.com` (or your region).                     |
| `POSTHOG_API_KEY`         | Same as NEXT_PUBLIC for server-side; or a distinct server key.   |
| `RESEND_FROM_EMAIL`       | `songs@makeasongaboutyou.com` (default). Must match verified domain. |

Already-required vars that should already be set: `ANTHROPIC_API_KEY`,
`GEMINI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRODUCT_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `NEXT_PUBLIC_APP_URL`.

## 4. Vercel Cron for the failure monitor

Add to `vercel.json` (create if missing):

```json
{
  "crons": [
    { "path": "/api/monitor/failures", "schedule": "*/1 * * * *" }
  ]
}
```

Then set the `x-cron-secret` header on the cron call. Vercel Cron supports
sending a custom header via `CRON_SECRET` via the dashboard Cron settings, or
you can move the check to compare against a URL query param if that's easier.

## 5. DNS records for email deliverability (GoDaddy)

We send transactional email from `@makeasongaboutyou.com` via Resend. For
Gmail, Yahoo, and Apple Mail to not junk it, add these records in GoDaddy →
DNS Management for `makeasongaboutyou.com`. **Get the exact values from the
Resend dashboard → Domains → makeasongaboutyou.com**, because some are
domain-specific.

### SPF (TXT)
- Type: `TXT`
- Host: `@`
- Value: `v=spf1 include:_spf.resend.com ~all`
  - If you already have an SPF record with other `include:` entries, merge
    them into a single record (you cannot have two SPF TXTs).

### DKIM (3 CNAMEs)
Resend gives you 3 CNAMEs that look like:
- Host: `resend._domainkey`
- Value: `resend._domainkey.emaildomain.amazonses.com` (example — use the real one Resend shows you)

Add all three exactly as shown.

### DMARC (TXT)
- Type: `TXT`
- Host: `_dmarc`
- Value: `v=DMARC1; p=none; rua=mailto:dmarc@makeasongaboutyou.com; pct=100; aspf=r; adkim=r`
  - `p=none` for the first 30 days so you can see reports before tightening.
  - After a month with clean reports, switch to `p=quarantine` or `p=reject`.

### MX (optional — only if you want inbound email)
- Type: `MX`
- Host: `@`
- Priority: 10
- Value: up to you — Resend does not provide inbound. Point to Google Workspace
  or Fastmail if you want `hello@makeasongaboutyou.com` to actually receive mail.

After records propagate (5–60 min), go back to Resend → Domains → Verify. All
three columns should go green. Do **not** send production email until this is
done or you'll burn reputation.

## 6. PostHog setup

1. Create a PostHog project (us.posthog.com) if you haven't.
2. Copy the Project API key into `NEXT_PUBLIC_POSTHOG_KEY`.
3. After deploy, verify events are arriving on the "Activity" tab:
   `landing_viewed`, `preview_email_submitted`, `preview_generated`,
   `preview_regenerated`, `preview_played`, `checkout_started`,
   `checkout_completed`.
4. Build a funnel: Landing → Preview email → Preview generated → Checkout
   started → Checkout completed. This is the canonical conversion funnel.

## 7. Smoke test before flipping traffic

Use the `qa-loop` skill or do it manually:

1. Go to makeasongaboutyou.com
2. Fill the quiz end-to-end
3. Enter email, click "Preview My Song · Free"
4. Confirm preview renders with lyrics + 20s audio
5. Click "Regenerate audio" — count should drop from 3 to 2
6. Click "Unlock the Full Song — $14.99", use Stripe test card 4242 4242 4242 4242
7. After redirect, confirm you land on /song/{songId} and audio loads
8. Confirm the "Your song is ready" email arrives within a minute
9. Inspect the `previews` table — row should have `purchased=true` and
   `promoted_song_id` set
10. Inspect the `orders` table — `status` should be `completed`

## 8. Cost controls

- Lyria 3 Pro: **$0.08 per generation** (confirmed via GCP billing SKU
  `CE81-EC1B-0F04`). 4 attempts per preview (1 initial + 3 regen) = $0.32
  max cost per unique preview attempt.
- Anthropic Claude Sonnet 4: ~$0.01–0.02 per lyric generation.
- Per-preview max Lyria spend if user uses all regens: ~$0.32.
- Conversion break-even: at 1% of previews converting, each $14.99 purchase
  covers 46 free previews' worth of audio. At 5% conversion, each purchase
  covers 234.
- Per-IP rate limits (hourly) enforce the ceiling if anyone tries to abuse.

## 9. Rollback

If anything goes wrong, the webhook still falls back to the legacy
`/api/generate` path when `preview_id` is missing from metadata. Old orders
keep working.

Revert strategy:
1. Revert to the previous commit.
2. Delete the new Stripe webhook endpoint if it's separate.
3. Leave the Supabase migration in place — it's additive.
