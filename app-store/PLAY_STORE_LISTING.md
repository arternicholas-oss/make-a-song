# Google Play Console — Listing Copy

Paste into Google Play Console → Make a Song About You → Grow → Store presence → Main store listing.

---

## App Information (set once)

| Field | Value |
|---|---|
| **Package name** | `com.makeasongaboutyou.app` |
| **App category** | Entertainment |
| **Tags** (up to 5) | Music, Gifts & Cards, Creative Tools, Lyrics, Personalization |
| **Content rating** | Teen (13+) |
| **Target audience** | 18+ (purchasing) |
| **Contains ads** | No |
| **In-app purchases** | No (external web payment via Stripe) |
| **Privacy Policy URL** | `https://makeasongaboutyou.com/privacy` |

---

## Main Store Listing

### App name (max 50 chars — currently 26)
```
Make a Song About You
```

### Short description (max 80 chars — currently 79)
```
Turn any story into a one-of-one song. Written for them, in under 60 seconds.
```

### Full description (max 4000 chars)
```
A personalized song written just for the person you love. In under 60 seconds.

Answer a few questions about someone — their quirks, your shared memories, the inside jokes — and we'll turn it into a real, produced song that could only ever be about them. Every song is genuinely one-of-one. No one else has it, no one else ever will.

HOW IT WORKS
1. Pick an occasion — birthday, anniversary, wedding, proposal, new baby, memorial, "just because," or anything else.
2. Pick a genre and a vibe — 70s love ballad, 90s R&B slow jam, country story song, pop anthem, hip-hop, gospel.
3. Tell us about them — the little things, the big things, what only you would know.
4. We write, record, and deliver the song to your inbox (or directly to them). Usually in under a minute.

PERFECT FOR
• Birthdays that need to actually feel special this year
• Anniversaries where "another card" won't cut it
• Weddings — play it for your first dance, or gift it to the couple
• Proposals — yes, people have used these to propose
• Memorials and tributes
• New baby announcements
• Teacher, coach, or mentor appreciation
• Just telling someone you love them in a way they'll remember

EVERY SONG INCLUDES
• A full, produced track (vocals + instrumentation)
• Complete printable lyrics
• A shareable link with their name on it
• An optional "send from me" delivery to their email
• An animated lyric video you can share to TikTok, Instagram, or text them directly

PRICING
$14.99 per song. No subscription. No hidden tiers. One price, one song, yours forever.

BRAND MODE
Have a launch, a team to thank, or a campaign? Switch to Brand Mode for jingles, internal hype tracks, customer appreciation songs, and launch anthems.

PRIVACY
We only use the details you give us to write that one song. We don't sell your data, we don't train on your submissions, and we delete drafts you don't keep. The shareable links expire after 30 days unless you save the song to your account.

Made with care. Not automation slop.
```

---

## Graphics

| Asset | Size | Count | Notes |
|---|---|---|---|
| **App icon** | 512 × 512 PNG (32-bit alpha) | 1 | Export from `icon-design.svg`; no transparency on the icon itself, full bleed |
| **Feature graphic** | 1024 × 500 JPEG/PNG | 1 | Branded hero with the tagline — do NOT put the app name (Play adds it) |
| **Phone screenshots** | 1080 × 1920 or 1080 × 2400 PNG/JPEG | 2–8 | Same content plan as iOS |
| **7-inch tablet** | 1200 × 1920 PNG/JPEG | 0–8 | Optional but improves discoverability |
| **10-inch tablet** | 1600 × 2560 PNG/JPEG | 0–8 | Optional |

---

## Data Safety Form (Play Console → App content → Data safety)

### Data collection & security
- Does your app collect or share any of the required user data types? **Yes**
- Is all of the user data collected by your app encrypted in transit? **Yes** (HTTPS only)
- Do you provide a way for users to request that their data be deleted? **Yes** (support@makeasongaboutyou.com and in-app footer link)

### Data types collected

| Category | Type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|---|
| Personal info | Name | Yes | No | Yes | App functionality |
| Personal info | Email address | Yes | No | No | App functionality, Communications |
| Financial info | User payment info | Processed by Stripe; not stored by us | No | No | App functionality |
| App activity | Product interaction | Yes | No | No | Analytics (PostHog) |
| App activity | In-app search history | No | — | — | — |
| App info and performance | Crash logs | Yes | No | No | Analytics |
| App info and performance | Diagnostics | Yes | No | No | Analytics |
| Audio | Music files | No | — | — | — |
| Audio | User-generated audio | No | — | — | — |

### Security practices
- Data is encrypted in transit: **Yes**
- You can request that data be deleted: **Yes**
- Committed to Play Families policy: **No** (app is Teen+, not targeted at children)
- Independent security review: No

---

## App content

- **Privacy policy:** `https://makeasongaboutyou.com/privacy` ✅
- **Ads:** No ads
- **App access:** All functionality is available without restrictions (no login wall for the main flow)
- **Content rating:** Complete the IARC questionnaire — expect Teen.
- **Target audience:** 18+
- **News apps:** No
- **COVID-19 tracing:** No
- **Data safety:** (see above)
- **Government app:** No
- **Financial features:** No

---

## Pre-launch Checklist

- [ ] Upload a signed AAB (see `PUBLISH_GUIDE.md` → Android section)
- [ ] Pass Play Console pre-launch report (automated device lab tests)
- [ ] Internal testing track: add yourself + 2 family members, test install + payment round-trip
- [ ] Closed testing track: 12 testers, 14 days (Play requires this for new developer accounts as of Nov 2023)
- [ ] Promote to Production
