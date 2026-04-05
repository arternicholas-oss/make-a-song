-- ─────────────────────────────────────────────────────────────────────────────
-- Make a Song About You — Supabase Schema
-- Run this in: supabase.com → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Orders table: one row per purchase attempt
create table if not exists orders (
  id                uuid default gen_random_uuid() primary key,
  session_id        text unique not null,       -- localStorage session ID from browser
  stripe_session_id text,                       -- Stripe checkout session ID
  stripe_payment_id text,                       -- Stripe payment intent ID
  email             text,                       -- Buyer's email (captured pre-payment)
  paid              boolean default false,      -- Set to true by webhook
  occasion          text,                       -- birthday, anniversary, brand, etc.
  genre             text,                       -- 70s_love_song, 90s_rb, etc.
  tone              text,                       -- romantic, heartfelt, playful, funny
  brand_tone        text,                       -- bold, warm, premium, fun (brand mode only)
  answers           jsonb,                      -- Full questionnaire answers
  is_brand          boolean default false,
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

-- Songs table: one row per generated song
create table if not exists songs (
  id              uuid default gen_random_uuid() primary key,
  song_id         text unique not null,         -- Public-facing ID e.g. sng_8fk29xz
  order_id        uuid references orders(id) on delete cascade,
  title           text,
  sections        jsonb,                        -- [{label: string, lines: string[]}]
  recipient_name  text,                         -- For display on shareable page
  genre           text,
  tone            text,
  occasion        text,
  is_brand        boolean default false,
  regen_count     int default 0,               -- Max 1 free regen
  created_at      timestamptz default now(),
  expires_at      timestamptz default (now() + interval '30 days')
);

-- Waitlist: Phase 2 musician marketplace
create table if not exists waitlist (
  id         uuid default gen_random_uuid() primary key,
  email      text unique not null,
  source     text,                              -- 'post_song', 'landing', 'send_modal'
  created_at timestamptz default now()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
alter table orders  enable row level security;
alter table songs   enable row level security;
alter table waitlist enable row level security;

-- Songs are publicly readable by song_id (shareable links work without auth)
create policy "Songs are publicly readable"
  on songs for select
  using (true);

-- Only service role can insert/update orders and songs (via API routes)
create policy "Service role manages orders"
  on orders for all
  using (auth.role() = 'service_role');

create policy "Service role manages songs"
  on songs for all
  using (auth.role() = 'service_role');

create policy "Service role manages waitlist"
  on waitlist for all
  using (auth.role() = 'service_role');

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
create index if not exists orders_session_id_idx    on orders(session_id);
create index if not exists orders_stripe_session_idx on orders(stripe_session_id);
create index if not exists songs_song_id_idx         on songs(song_id);
create index if not exists songs_order_id_idx        on songs(order_id);

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger orders_updated_at
  before update on orders
  for each row execute function update_updated_at();
