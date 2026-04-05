# Make a Song About You — Developer Handoff

## What You're Building

A consumer web app where users fill out a questionnaire about a person (or brand),
pay $14.99, and receive a custom AI-generated song. The product includes:

- 9 personal occasions + brand mode
- 6 genres, 4 personal tones, 4 brand tones
- Full Stripe checkout with Apple Pay / Google Pay
- AI generation via Anthropic Claude API
- Email delivery via Resend
- Shareable song links (30-day expiry)
- Animated TikTok lyric video mode
- "Send the Song" email flow

---

## File Map

```
make-a-song/
├── package.json                          Dependencies
├── next.config.js                        Next.js config
├── tailwind.config.ts                    Tailwind + custom colors
├── .env.local                            Environment variables (fill in all values)
├── supabase-schema.sql                   Run this in Supabase SQL editor FIRST
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                   Root layout (fonts, metadata)
│   │   ├── globals.css                  Global styles + animations
│   │   ├── page.tsx                     Home → renders App.tsx
│   │   ├── not-found.tsx                404 page
│   │   │
│   │   ├── checkout/
│   │   │   └── success/page.tsx         Post-payment loading screen (polls for song)
│   │   │
│   │   ├── song/[songId]/
│   │   │   ├── page.tsx                 Server-rendered song page (SEO + OG tags)
│   │   │   └── SongPageClient.tsx       Client component for song display
│   │   │
│   │   └── api/
│   │       ├── create-checkout/route.ts  Creates Stripe checkout session
│   │       ├── webhook/route.ts          Stripe webhook → marks order paid → triggers generation
│   │       ├── generate/route.ts         Calls Claude API, saves song, sends email
│   │       ├── song/[songId]/route.ts    GET song by ID
│   │       ├── song-by-session/route.ts  GET song by Stripe session (for polling)
│   │       ├── regen/route.ts            POST regen (checks 1-regen limit)
│   │       └── waitlist/route.ts         POST email to waitlist
│   │
│   ├── components/
│   │   └── App.tsx                      Main app component — PORT UI FROM PROTOTYPE HERE
│   │
│   └── lib/
│       ├── types.ts                     TypeScript types
│       ├── constants.ts                 All data: occasions, genres, tones, colors, captions
│       ├── prompts.ts                   AI prompt builders (personal + brand) + parser
│       └── supabase.ts                  Supabase clients (public + admin)
```

---

## Setup Order

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Create a new project at supabase.com
2. Go to SQL Editor → New query
3. Paste contents of `supabase-schema.sql` and run it
4. Go to Settings → API → copy URL and keys into `.env.local`

### 3. Set up Stripe
1. Create account at stripe.com
2. Create product: "Make a Song About You", one-time price $14.99
3. Copy Price ID into `.env.local` as `STRIPE_PRICE_ID`
4. Copy publishable + secret keys into `.env.local`
5. Go to Developers → Webhooks → Add endpoint:
   - URL: `https://yourdomain.com/api/webhook`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
6. Copy webhook signing secret into `.env.local` as `STRIPE_WEBHOOK_SECRET`
7. Enable Apple Pay and Google Pay under Settings → Payment Methods

### 4. Set up Anthropic
1. Get API key from console.anthropic.com
2. Add $20 credit to your account
3. Copy key into `.env.local` as `ANTHROPIC_API_KEY`

### 5. Set up Resend
1. Create account at resend.com
2. Verify your sending domain (or use resend.dev for testing)
3. Copy API key into `.env.local` as `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified email

### 6. Port the UI
The complete UI is already built as a working prototype in `make-a-song-about-you.jsx`.
Port it into `src/components/App.tsx` screen by screen.

**Key differences when porting:**
- Replace the direct `fetch('https://api.anthropic.com/...')` in the prototype's
  `generate()` function with `fetch('/api/create-checkout', ...)` to go through
  Stripe payment first
- The prototype's "loading" screen won't be shown during production flow —
  Stripe redirect happens instead, and `/checkout/success` handles the loading state
- Keep localStorage session logic using `getOrCreateSessionId()` from `App.tsx`

### 7. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# (copy from .env.local)
```

### 8. Test end-to-end
1. Run `npm run dev`
2. Complete the full questionnaire
3. Use Stripe test card: `4242 4242 4242 4242`, any future date, any CVC
4. Confirm song is generated and email is received
5. Check Supabase dashboard to confirm orders and songs rows exist
6. Switch Stripe to live mode when ready to launch

---

## Critical: Stripe Webhook for Local Dev

To test webhooks locally, use the Stripe CLI:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook

# This gives you a local webhook signing secret — use it in .env.local for dev
```

---

## Environment Variables Checklist

```
✅ ANTHROPIC_API_KEY
✅ STRIPE_SECRET_KEY
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ STRIPE_WEBHOOK_SECRET
✅ STRIPE_PRICE_ID
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ RESEND_API_KEY
✅ RESEND_FROM_EMAIL
✅ NEXT_PUBLIC_APP_URL
```

---

## AI Prompts

All prompts live in `src/lib/prompts.ts`. This is the most important file in the
codebase — treat it like product, not code. Do not modify prompt content without
testing at least 10 generations across different genre/tone combos first.

The `buildPersonalPrompt()` and `buildBrandPrompt()` functions take the questionnaire
answers and return a complete prompt string ready to send to the Claude API.

The `parseSong()` function takes the raw Claude response and returns:
```ts
{
  title: string
  sections: { label: string; lines: string[] }[]
}
```

---

## Prototype Reference

`make-a-song-about-you.jsx` is the complete working UI prototype. It includes:

- All screens (landing through song output)
- All component styles
- Genre color system
- TikTok lyric video mode
- Send the Song modal
- Surprise Me randomizer
- Holiday countdown banner logic
- Brand mode questionnaire
- Animated song reveal

Port this into `src/components/App.tsx`. Do not rewrite from scratch.

---

## Launch Checklist

Before going live:

- [ ] All env vars set in Vercel dashboard
- [ ] Stripe webhook endpoint verified and receiving events
- [ ] Test card payment completes and song generates
- [ ] Email delivered successfully
- [ ] Shareable song link works
- [ ] Tested on iPhone Safari specifically
- [ ] OG image renders correctly (test with Twitter Card Validator)
- [ ] Stripe switched from test to live mode
- [ ] Refund policy configured in Stripe
- [ ] Custom domain connected in Vercel

---

## Questions?

The full product spec is in `make_a_song_about_you.docx`.
The complete UI prototype is in `make-a-song-about-you.jsx`.
All API routes are complete and production-ready.
All you need to port is the UI from the prototype into `src/components/App.tsx`.
