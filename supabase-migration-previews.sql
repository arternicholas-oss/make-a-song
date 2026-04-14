-- ─────────────────────────────────────────────────────────────────────────────
-- Make a Song About You — Preview-Before-Purchase Migration
-- Run this in: supabase.com → SQL Editor → New query → Run
-- This is additive. Safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── PREVIEWS TABLE ──────────────────────────────────────────────────────────
-- Draft song + audio captured BEFORE the user pays. They can regenerate up to
-- MAX_REGENS times, then decide to buy. On purchase, the preview is promoted
-- into a row in `songs` via the webhook.
create table if not exists previews (
  id                  uuid default gen_random_uuid() primary key,
  preview_id          text unique not null,            -- e.g. prv_8fk29xz, public ID
  session_id          text not null,                   -- browser localStorage session
  email               text not null,                   -- gate: we capture email up front
  ip                  text,                            -- for rate limiting / fraud signals
  occasion            text,
  genre               text,
  tone                text,
  brand_tone          text,
  is_brand            boolean default false,
  answers             jsonb,
  title               text,
  sections            jsonb,                           -- [{label, lines[]}]
  audio_url_preview   text,                            -- PUBLIC 20s clip (previews-audio bucket)
  audio_path_preview  text,                            -- storage path for 20s clip
  audio_url_full      text,                            -- signed-URL-only; DO NOT expose to client
  audio_path_full     text,                            -- storage path for full audio (private bucket)
  regen_count         int default 0,                   -- includes initial gen
  max_regens          int default 4,                   -- 1 initial + 3 regenerations = 4 total
  purchased           boolean default false,           -- set true by webhook when paid
  promoted_song_id    text,                            -- song_id once promoted into `songs`
  created_at          timestamptz default now(),
  updated_at          timestamptz default now(),
  expires_at          timestamptz default (now() + interval '7 days')
);

create index if not exists previews_preview_id_idx on previews(preview_id);
create index if not exists previews_session_id_idx on previews(session_id);
create index if not exists previews_email_idx      on previews(email);

alter table previews enable row level security;

-- Previews are readable publicly by preview_id (so the shareable preview URL
-- works without auth). Sensitive fields (audio_url_full, audio_path_full)
-- should be stripped by the API layer, not exposed to the client.
drop policy if exists "Previews are publicly readable" on previews;
create policy "Previews are publicly readable"
  on previews for select
  using (true);

drop policy if exists "Service role manages previews" on previews;
create policy "Service role manages previews"
  on previews for all
  using (auth.role() = 'service_role');

-- Defensively (re)create the updated_at trigger function so this migration
-- can run standalone on a fresh install. Harmless if already defined by
-- supabase-schema.sql.
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists previews_updated_at on previews;
create trigger previews_updated_at
  before update on previews
  for each row execute function update_updated_at();

-- ─── ORDERS: add status column ───────────────────────────────────────────────
-- The `paid` boolean stays for backward-compat. `status` is the new source of
-- truth:
--   draft      → created, not paid
--   paid       → payment confirmed, generation queued
--   generating → /api/generate is running
--   completed  → song finalized + email sent
--   failed     → generation failed after retries (refund-eligible)
--   refunded   → refunded via Stripe
alter table orders add column if not exists status text default 'draft';
alter table orders add column if not exists preview_id text;     -- link order to the preview it was purchased from
alter table orders add column if not exists refunded_at timestamptz;
alter table orders add column if not exists refund_reason text;
alter table orders add column if not exists failed_at timestamptz;
alter table orders add column if not exists failure_reason text;
alter table orders add column if not exists generation_started_at timestamptz;
alter table orders add column if not exists generation_completed_at timestamptz;

create index if not exists orders_status_idx     on orders(status);
create index if not exists orders_preview_id_idx on orders(preview_id);

-- ─── PREVIEW AUDIT LOG ───────────────────────────────────────────────────────
-- Tracks each generation / regeneration attempt for previews. Useful for
-- customer support, fraud detection, and cost monitoring.
create table if not exists preview_audit (
  id           uuid default gen_random_uuid() primary key,
  preview_id   text,
  session_id   text,
  email        text,
  ip           text,
  event        text,                                   -- 'create', 'regen', 'purchase', 'expire'
  attempt_no   int,
  lyria_ok     boolean,
  lyria_error  text,
  elapsed_ms   int,
  created_at   timestamptz default now()
);

create index if not exists preview_audit_preview_idx on preview_audit(preview_id);
create index if not exists preview_audit_email_idx   on preview_audit(email);
create index if not exists preview_audit_ip_idx      on preview_audit(ip);
create index if not exists preview_audit_time_idx    on preview_audit(created_at);

alter table preview_audit enable row level security;
drop policy if exists "Service role manages preview_audit" on preview_audit;
create policy "Service role manages preview_audit"
  on preview_audit for all
  using (auth.role() = 'service_role');

-- ─── IP RATE LIMITING ────────────────────────────────────────────────────────
-- Count-per-window table for cheap rate limiting. Enforced by API, not DB.
-- We use (ip, window_start) as a counter bucket. Cleanup old rows with a cron
-- or just periodic manual prune; data here is ephemeral.
create table if not exists ip_rate_limit (
  id           bigserial primary key,
  ip           text not null,
  action       text not null,                          -- 'preview_create', 'preview_regen'
  window_start timestamptz not null,                   -- bucket start (e.g. truncated to hour)
  count        int default 1,
  unique (ip, action, window_start)
);

create index if not exists ip_rate_limit_ip_action_idx on ip_rate_limit(ip, action, window_start);

alter table ip_rate_limit enable row level security;
drop policy if exists "Service role manages ip_rate_limit" on ip_rate_limit;
create policy "Service role manages ip_rate_limit"
  on ip_rate_limit for all
  using (auth.role() = 'service_role');

-- ─── SONGS: add audio_url column (legacy) + status linkage ───────────────────
-- songs.audio_url already exists in live schema; this is a safety net for
-- fresh installs that might be running the original schema without it.
alter table songs add column if not exists audio_url text;
alter table songs add column if not exists preview_id text;
alter table songs add column if not exists email text;
alter table songs add column if not exists email_sent_at timestamptz;   -- idempotency for song-ready email

create index if not exists songs_preview_id_idx on songs(preview_id);

-- ─── STORAGE BUCKETS ─────────────────────────────────────────────────────────
-- Create buckets via the Supabase dashboard (or the CLI). Required buckets:
--
--   previews-audio       (PUBLIC)  → holds 20s preview clips
--   songs-audio-private  (PRIVATE) → holds full-length audio; served via signed URL only
--
-- The existing `songs-audio` bucket can be left in place for legacy songs;
-- new full audio MUST land in `songs-audio-private`.
